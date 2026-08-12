"""services/ai-service - Python AI/analytics microservice.

Consumes domain.events (`appointment.*`, `review.received`) from RabbitMQ,
owns its own Postgres database (postgres-ai, via AI_DATABASE_URL - never
main-postgres), and publishes AI result events onto analytics.events for
services/notifications-service, services/appointments-service, and
services/companies-service to react to (Phase 12 moved the latter two off
the now-retired services/backend-projection-service). Never calls the
backend API directly - see docs/architecture/service-ownership.md and
docs/architecture/event-driven-model.md.

Evolved from python-worker/worker.py (same event bindings, same idea) but
backed by a dedicated Postgres instance instead of a SQLite file shared with
a Node.js sibling.

    python -m venv .venv
    .venv\\Scripts\\activate   (or `source .venv/bin/activate` on macOS/Linux)
    pip install -r requirements.txt
    copy .env.example .env    (or `cp` on macOS/Linux)
    python src/main.py
"""
from __future__ import annotations

import json
import signal
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable

import pika
import psycopg2.extensions

import config
import logger
from db import repository, schema
from db.pool import get_connection
from handlers import appointment_requested, review_received
from rabbitmq.consumer import setup_consumer


def make_health_handler(
    conn: psycopg2.extensions.connection,
    get_channel: Callable[[], "pika.adapters.blocking_connection.BlockingChannel | None"],
) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 - stdlib signature
            pass  # keep stdout focused on this service's own [ai-service] logs

        def do_GET(self) -> None:  # noqa: N802 - stdlib method name
            if self.path == "/health/live":
                self._respond(200, {"status": "ok"})
                return
            if self.path == "/health/ready":
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                    channel = get_channel()
                    if channel is None or not channel.is_open:
                        raise RuntimeError("RabbitMQ channel is not open")
                    self._respond(200, {"status": "ok"})
                except Exception as exc:  # noqa: BLE001
                    self._respond(503, {"status": "not-ready", "error": str(exc)})
                return
            self.send_response(404)
            self.end_headers()

        def _respond(self, status: int, body: dict[str, Any]) -> None:
            payload = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    return Handler


def make_on_message(conn: psycopg2.extensions.connection, channel: "pika.adapters.blocking_connection.BlockingChannel"):
    def on_message(ch, method, _properties, body: bytes) -> None:
        try:
            envelope: dict[str, Any] = json.loads(body)
            event_id = envelope.get("id")
            event_type = envelope.get("type", method.routing_key)
            data = envelope.get("data", {}) or {}

            if event_id and not repository.mark_processed(conn, event_id, config.CONSUMER_NAME):
                logger.info("already processed - skipping", event_id=event_id)
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            if event_type == "review.received":
                review_received.handle(conn, channel, data)
            elif event_type == "appointment.requested":
                appointment_requested.handle(conn, channel, data)
            elif event_type.startswith("appointment.") and data.get("companyId"):
                repository.increment_event_count(conn, event_type, data["companyId"])
            else:
                logger.info("no handler for this event type - ignoring", event_type=event_type)

            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as exc:  # noqa: BLE001 - log and dead-letter rather than crash the consume loop
            logger.error("failed to process message - routing to dead-letter queue", err=str(exc))
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    return on_message


def main() -> None:
    conn = get_connection()
    schema.ensure_schema(conn)

    connection = pika.BlockingConnection(pika.URLParameters(config.RABBITMQ_URL))
    channel = connection.channel()
    setup_consumer(channel)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=config.QUEUE_NAME, on_message_callback=make_on_message(conn, channel))

    http_server = ThreadingHTTPServer(("0.0.0.0", config.HEALTH_PORT), make_health_handler(conn, lambda: channel))
    http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
    http_thread.start()
    logger.info("health server listening", port=config.HEALTH_PORT, routes=["/health/live", "/health/ready"])

    def shutdown(*_args: Any) -> None:
        logger.info("received shutdown signal")
        channel.stop_consuming()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    logger.info("listening for events", queue=config.QUEUE_NAME, bindings=["appointment.*", "review.received"])
    try:
        channel.start_consuming()
    finally:
        http_server.shutdown()
        connection.close()
        conn.close()


if __name__ == "__main__":
    main()
