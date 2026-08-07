"""Publishes AI result events onto analytics.events - see
contracts/events/ai.*.v1.json and docs/architecture/event-driven-model.md.
This service never publishes onto domain.events (that exchange is owned by
the backend's outbox) and never calls the backend API directly."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import pika

import config


def _envelope(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "source": "ai-service",
        "version": "1.0",
        "time": datetime.now(timezone.utc).isoformat(),
        "correlationId": str(uuid.uuid4()),
        "data": data,
    }


def _publish(
    channel: "pika.adapters.blocking_connection.BlockingChannel",
    event_type: str,
    routing_key: str,
    data: dict[str, Any],
) -> None:
    channel.basic_publish(
        exchange=config.ANALYTICS_EVENTS_EXCHANGE,
        routing_key=routing_key,
        body=json.dumps(_envelope(event_type, data)),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )


def publish_rating_updated(
    channel: "pika.adapters.blocking_connection.BlockingChannel",
    company_id: str,
    average_rating: float,
    review_count: int,
) -> None:
    _publish(
        channel,
        "analytics.company_rating_updated",
        "analytics.company_rating_updated",
        {"companyId": company_id, "averageRating": average_rating, "reviewCount": review_count},
    )


def publish_recommendation_created(
    channel: "pika.adapters.blocking_connection.BlockingChannel",
    recommendation_id: str,
    appointment_id: str,
    company_id: str,
    summary: str,
    confidence: float,
) -> None:
    _publish(
        channel,
        "ai.appointment_recommendation_created",
        "ai.appointment_recommendation_created",
        {
            "recommendationId": recommendation_id,
            "appointmentId": appointment_id,
            "companyId": company_id,
            "summary": summary,
            "confidence": confidence,
        },
    )


def publish_job_failed(
    channel: "pika.adapters.blocking_connection.BlockingChannel",
    job_type: str,
    reason: str,
    related_aggregate_id: str | None = None,
) -> None:
    _publish(
        channel,
        "ai.job_failed",
        "ai.job_failed",
        {"jobId": str(uuid.uuid4()), "jobType": job_type, "relatedAggregateId": related_aggregate_id, "reason": reason},
    )
