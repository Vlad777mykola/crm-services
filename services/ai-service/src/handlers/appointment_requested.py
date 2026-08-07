"""Handles appointment.requested: produces a first-pass recommendation and
publishes ai.appointment_recommendation_created for
services/backend-projection-service to turn into a read-model row in the
main database. The scoring below is a placeholder heuristic, not a trained
model - swap `_score` out once there's real signal to learn from; the
RabbitMQ/Postgres plumbing around it does not need to change."""
from __future__ import annotations

from typing import Any

import psycopg2.extensions

import rabbitmq.publisher as publisher
from db import repository


def _score(data: dict[str, Any]) -> tuple[str, float]:
    service_name = data.get("serviceName", "this service")
    return (
        f"Based on past demand, {service_name} appointments like this are usually confirmed quickly.",
        0.7,
    )


def handle(conn: psycopg2.extensions.connection, channel: Any, data: dict[str, Any]) -> None:
    appointment_id = data.get("appointmentId")
    company_id = data.get("companyId")
    if not appointment_id or not company_id:
        print("[ai-service] ignoring appointment.requested - missing appointmentId/companyId")
        return

    repository.increment_event_count(conn, "appointment.requested", company_id)
    summary, confidence = _score(data)
    recommendation_id = repository.create_recommendation(conn, appointment_id, company_id, summary, confidence)
    publisher.publish_recommendation_created(channel, recommendation_id, appointment_id, company_id, summary, confidence)
    print(f"[ai-service] recommendation={recommendation_id} appointment={appointment_id} confidence={confidence}")
