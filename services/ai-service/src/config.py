"""Environment/config for the AI service - loaded once, imported everywhere else."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

AI_DATABASE_URL = os.getenv("AI_DATABASE_URL", "postgres://ai:ai_password@localhost:5433/ai")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://crm:crm_local_only@localhost:5672")
HEALTH_PORT = int(os.getenv("AI_SERVICE_HEALTH_PORT", "4200"))

DOMAIN_EVENTS_EXCHANGE = "domain.events"
ANALYTICS_EVENTS_EXCHANGE = "analytics.events"
COMMANDS_EXCHANGE = "commands"
DOMAIN_EVENTS_DLX = "domain.events.dlx"
COMMANDS_DLX = "commands.dlx"
AI_DEAD_QUEUE = "ai.dead.q"

QUEUE_NAME = "ai-service.q"
CONSUMER_NAME = "ai-service"
