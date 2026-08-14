# notifications-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Simulated email notifications for appointment and review events; analytics rating updates.

## Consumes (no publish)

| Binding | Events handled |
| ------- | -------------- |
| `domain.events` / `appointment.*` | requested, approved, rejected, cancelled, completed |
| `domain.events` / `review.received` | review notifications |
| `analytics.events` / `analytics.company_rating_updated` | rating notifications |

## Queue

`notifications-service.q` · No outbox · Idempotency: `notifications_schema.processed_events`

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
