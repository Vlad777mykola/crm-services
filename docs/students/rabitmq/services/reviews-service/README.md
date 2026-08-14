# reviews-service messaging

## Messaging status

**CURRENT VERIFIED** — publisher only

## Publishes

`review.received` → `domain.events`

## Consumes

None.

## Outbox

`reviews_schema.outbox_events` · Publisher: `outbox-publisher-reviews`

## Downstream consumers

notifications-service, ai-service, metrics-service

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
