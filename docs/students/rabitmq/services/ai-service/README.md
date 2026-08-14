# ai-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

AI processing: recommendations, rating analytics.

## Consumes

`domain.events`: `appointment.*`, `review.received`

- Full handlers: `appointment.requested`, `review.received`
- Other `appointment.*`: counter increment only

## Publishes

| Event | Exchange |
| ----- | -------- |
| `ai.appointment_recommendation_created` | `analytics.events` |
| `analytics.company_rating_updated` | `analytics.events` |

`MESSAGING_MODE`: `direct` (default) or `outbox`

## Queue

`ai-service.q` · DB: postgres-ai · Idempotency: `processed_events`

## Note

`ai.job_failed` publisher exists but **no handler calls it**. `ai.company_insight_created` **not published** (companies-service consumes it — gap).

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
