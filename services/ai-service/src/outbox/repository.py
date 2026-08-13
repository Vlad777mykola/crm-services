"""Transactional outbox writes for ai_schema.outbox_events."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any

import psycopg2.extensions

import config

ANALYTICS_ROUTING: dict[str, str] = {
    "analytics.company_rating_updated": "analytics.company_rating_updated",
    "ai.appointment_recommendation_created": "ai.appointment_recommendation_created",
    "ai.job_failed": "ai.job_failed",
}


@dataclass(frozen=True)
class OutboxWrite:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict[str, Any]


def record_outbox_event(conn: psycopg2.extensions.connection, write: OutboxWrite) -> str:
    routing_key = ANALYTICS_ROUTING.get(write.event_type)
    if routing_key is None:
        raise ValueError(f"no outbox routing for event type {write.event_type}")

    event_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_schema.outbox_events
              ("id", "eventType", exchange, "routingKey", "aggregateType", "aggregateId", payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            """,
            (
                event_id,
                write.event_type,
                config.ANALYTICS_EVENTS_EXCHANGE,
                routing_key,
                write.aggregate_type,
                write.aggregate_id,
                json.dumps(write.payload),
            ),
        )
    return event_id
