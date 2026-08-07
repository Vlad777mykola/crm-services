"""Sets up the durable queue (with a dead-letter exchange) and bindings this
service consumes from. Message dispatch and ack/nack stay in main.py since
pika's blocking API ties consumption directly to the main loop."""
from __future__ import annotations

import pika

import config
from rabbitmq.topology import declare_topology


def setup_consumer(channel: "pika.adapters.blocking_connection.BlockingChannel") -> None:
    declare_topology(channel)
    channel.queue_declare(
        queue=config.QUEUE_NAME,
        durable=True,
        arguments={"x-dead-letter-exchange": config.DOMAIN_EVENTS_DLX},
    )
    channel.queue_bind(exchange=config.DOMAIN_EVENTS_EXCHANGE, queue=config.QUEUE_NAME, routing_key="appointment.*")
    channel.queue_bind(exchange=config.DOMAIN_EVENTS_EXCHANGE, queue=config.QUEUE_NAME, routing_key="review.received")
