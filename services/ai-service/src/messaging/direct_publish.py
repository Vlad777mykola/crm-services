"""Publish payloads produced by handlers when MESSAGING_MODE=direct."""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import pika

import config


@dataclass(frozen=True)
class PublishPayload:
    event_type: str
    routing_key: str
    data: dict[str, Any]


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


def publish_payloads(channel: "pika.adapters.blocking_connection.BlockingChannel", payloads: list[PublishPayload]) -> None:
    for payload in payloads:
        channel.basic_publish(
            exchange=config.ANALYTICS_EVENTS_EXCHANGE,
            routing_key=payload.routing_key,
            body=json.dumps(_envelope(payload.event_type, payload.data)),
            properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
        )
