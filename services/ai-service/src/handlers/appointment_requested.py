"""Handles appointment.requested: recommendation DB work + publish/outbox obligation."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import psycopg2.extensions

import logger
from db import repository
from messaging.direct_publish import PublishPayload
from outbox.repository import OutboxWrite


@dataclass
class HandlerResult:
    direct_publish: list[PublishPayload]
    outbox_writes: list[OutboxWrite]


def _score(data: dict[str, Any]) -> tuple[str, float]:
    service_name = data.get("serviceName", "this service")
    return (
        f"Based on past demand, {service_name} appointments like this are usually confirmed quickly.",
        0.7,
    )


def handle_db(conn: psycopg2.extensions.connection, data: dict[str, Any]) -> HandlerResult | None:
    appointment_id = data.get("appointmentId")
    company_id = data.get("companyId")
    if not appointment_id or not company_id:
        logger.warn("ignoring appointment.requested - missing appointmentId/companyId")
        return None

    repository.increment_event_count(conn, "appointment.requested", company_id)
    summary, confidence = _score(data)
    recommendation_id = repository.create_recommendation(conn, appointment_id, company_id, summary, confidence)

    payload = {
        "recommendationId": recommendation_id,
        "appointmentId": appointment_id,
        "companyId": company_id,
        "summary": summary,
        "confidence": confidence,
    }

    return HandlerResult(
        direct_publish=[
            PublishPayload(
                event_type="ai.appointment_recommendation_created",
                routing_key="ai.appointment_recommendation_created",
                data=payload,
            )
        ],
        outbox_writes=[
            OutboxWrite(
                event_type="ai.appointment_recommendation_created",
                aggregate_type="ai_recommendation",
                aggregate_id=recommendation_id,
                payload=payload,
            )
        ],
    )
