"""Declares the exchanges and dead-letter topology this service depends on.
Every service that talks to RabbitMQ declares this same shape independently
(see docs/architecture/event-driven-model.md) instead of importing a shared
package, so each remains deployable on its own. Idempotent - whichever
service starts first "wins"."""
from __future__ import annotations

import pika

import config


def declare_topology(channel: "pika.adapters.blocking_connection.BlockingChannel") -> None:
    channel.exchange_declare(exchange=config.DOMAIN_EVENTS_EXCHANGE, exchange_type="topic", durable=True)
    channel.exchange_declare(exchange=config.ANALYTICS_EVENTS_EXCHANGE, exchange_type="topic", durable=True)
    channel.exchange_declare(exchange=config.COMMANDS_EXCHANGE, exchange_type="topic", durable=True)
    channel.exchange_declare(exchange=config.DOMAIN_EVENTS_DLX, exchange_type="topic", durable=True)
    channel.exchange_declare(exchange=config.COMMANDS_DLX, exchange_type="topic", durable=True)

    channel.queue_declare(queue=config.AI_DEAD_QUEUE, durable=True)
    channel.queue_bind(exchange=config.DOMAIN_EVENTS_DLX, queue=config.AI_DEAD_QUEUE, routing_key="#")
