# specialists-service messaging

## Messaging status

**CURRENT VERIFIED** — publisher only (no RabbitMQ consumer process)

## Service role

Specialist profiles.

## Publishes

`specialist.created`, `specialist.updated` → `domain.events` via `specialists_schema.outbox_events`

## Consumes

None — HTTP-only `main.ts`, no `rabbitmq/` directory.

## Queue

None.

## Outbox

Yes — published by `outbox-publisher-specialists`

## Idempotency

`processed_events` table exists; no consumer in this service.

## If messaging is added later

Follow [16-add-new-service.md](../../common/16-add-new-service.md).

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
