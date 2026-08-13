"""Consumer inbox transaction for AI service."""
from __future__ import annotations

from typing import Any, Callable

import pika
import psycopg2.extensions

import config
import logger
from db import repository
from handlers import appointment_requested, review_received
from messaging.direct_publish import publish_payloads
from outbox.repository import record_outbox_event


def _run_handler_db(
    conn: psycopg2.extensions.connection,
    event_type: str,
    data: dict[str, Any],
) -> appointment_requested.HandlerResult | review_received.HandlerResult | None:
    if event_type == "review.received":
        return review_received.handle_db(conn, data)
    if event_type == "appointment.requested":
        return appointment_requested.handle_db(conn, data)
    if event_type.startswith("appointment.") and data.get("companyId"):
        repository.increment_event_count(conn, event_type, data["companyId"])
        return None
    logger.info("no handler for this event type - ignoring", event_type=event_type)
    return None


def process_message(
    conn: psycopg2.extensions.connection,
    channel: pika.adapters.blocking_connection.BlockingChannel,
    envelope: dict[str, Any],
) -> None:
    event_id = envelope.get("id")
    event_type = str(envelope.get("type", ""))
    data = envelope.get("data", {}) or {}

    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("BEGIN")

        if event_id and not repository.mark_processed(conn, event_id, config.CONSUMER_NAME):
            with conn.cursor() as cur:
                cur.execute("COMMIT")
            logger.info("already processed - skipping", event_id=event_id)
            return

        result = _run_handler_db(conn, event_type, data)

        if result is not None:
            if config.MESSAGING_MODE == "outbox":
                for write in result.outbox_writes:
                    record_outbox_event(conn, write)
            elif config.MESSAGING_MODE == "direct":
                pass
            else:
                raise RuntimeError(f"unsupported MESSAGING_MODE: {config.MESSAGING_MODE}")

        with conn.cursor() as cur:
            cur.execute("COMMIT")

        if result is not None and config.MESSAGING_MODE == "direct":
            publish_payloads(channel, result.direct_publish)

    except Exception:
        with conn.cursor() as cur:
            cur.execute("ROLLBACK")
        raise
    finally:
        conn.autocommit = True
