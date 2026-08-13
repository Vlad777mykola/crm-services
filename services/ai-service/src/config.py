"""Environment/config for the AI service - loaded once, imported everywhere else."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

AI_DATABASE_URL = os.getenv("AI_DATABASE_URL", "postgres://ai:ai_password@localhost:5433/ai")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://crm:crm_local_only@localhost:5672")
MESSAGING_MODE = os.getenv("MESSAGING_MODE", "direct").strip().lower()
if MESSAGING_MODE not in ("direct", "outbox"):
    raise SystemExit("ai-service configuration invalid — MESSAGING_MODE must be 'direct' or 'outbox'")
try:
    HEALTH_PORT = int(os.getenv("AI_SERVICE_HEALTH_PORT", "4200"))
except ValueError:
    raise SystemExit("ai-service configuration invalid — AI_SERVICE_HEALTH_PORT must be an integer")


def validate_config() -> None:
    """Minimal startup validation — full Pydantic refactor deferred."""
    missing: list[str] = []
    if not AI_DATABASE_URL:
        missing.append("AI_DATABASE_URL")
    if not RABBITMQ_URL:
        missing.append("RABBITMQ_URL")
    if missing:
        raise SystemExit(f"ai-service configuration invalid — missing: {', '.join(missing)}")
    if HEALTH_PORT <= 0:
        raise SystemExit("ai-service configuration invalid — AI_SERVICE_HEALTH_PORT must be positive")


validate_config()

DOMAIN_EVENTS_EXCHANGE = "domain.events"
ANALYTICS_EVENTS_EXCHANGE = "analytics.events"
COMMANDS_EXCHANGE = "commands"
DOMAIN_EVENTS_DLX = "domain.events.dlx"
COMMANDS_DLX = "commands.dlx"
AI_DEAD_QUEUE = "ai.dead.q"

QUEUE_NAME = "ai-service.q"
CONSUMER_NAME = "ai-service"
