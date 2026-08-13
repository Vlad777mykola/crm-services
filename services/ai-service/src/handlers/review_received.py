"""Handles review.received: stats DB work + publish/outbox obligation."""
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


def handle_db(conn: psycopg2.extensions.connection, data: dict[str, Any]) -> HandlerResult | None:
    company_id = data.get("companyId")
    rating = data.get("rating")
    if not company_id or not isinstance(rating, (int, float)):
        logger.warn("ignoring review.received - missing companyId/rating")
        return None

    repository.increment_event_count(conn, "review.received", company_id)
    review_count, average_rating = repository.record_daily_review(conn, company_id, rating)

    payload = {
        "companyId": company_id,
        "averageRating": average_rating,
        "reviewCount": review_count,
    }

    return HandlerResult(
        direct_publish=[
            PublishPayload(
                event_type="analytics.company_rating_updated",
                routing_key="analytics.company_rating_updated",
                data=payload,
            )
        ],
        outbox_writes=[
            OutboxWrite(
                event_type="analytics.company_rating_updated",
                aggregate_type="company",
                aggregate_id=company_id,
                payload=payload,
            )
        ],
    )
