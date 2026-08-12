"""Handles review.received: rolls the rating into company_daily_stats and
republishes the recomputed running average so notifications-service can tell
company managers about it. Direct evolution of the old python-worker's
company_rating_stats logic, now backed by postgres-ai instead of SQLite."""
from __future__ import annotations

from typing import Any

import psycopg2.extensions

import logger
import rabbitmq.publisher as publisher
from db import repository


def handle(conn: psycopg2.extensions.connection, channel: Any, data: dict[str, Any]) -> None:
    company_id = data.get("companyId")
    rating = data.get("rating")
    if not company_id or not isinstance(rating, (int, float)):
        logger.warn("ignoring review.received - missing companyId/rating")
        return

    repository.increment_event_count(conn, "review.received", company_id)
    review_count, average_rating = repository.record_daily_review(conn, company_id, rating)
    publisher.publish_rating_updated(channel, company_id, average_rating, review_count)
    logger.info(
        "published analytics.company_rating_updated",
        company_id=company_id,
        review_count=review_count,
        average_rating=average_rating,
    )
