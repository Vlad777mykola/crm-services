# outbox-publisher messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Infrastructure: polls `outbox_events`, publishes envelopes to RabbitMQ, marks rows published or failed.

## Publishes

Whatever is in outbox rows (`exchange` + `routingKey` columns) — not event-specific logic.

## Consumes

None.

## Deployments

One instance per `OUTBOX_SCHEMA` — see [SERVICES.md](../../SERVICES.md).

## Config

`DATABASE_URL`, `OUTBOX_SCHEMA`, `RABBITMQ_URL`, `POLL_INTERVAL_MS`, `BATCH_SIZE`, `MAX_ATTEMPTS`, `HEALTH_PORT`

## Dead queue

`outbox.dead.q` on `domain.events.dlx`

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
