# ai-service — Events

## Publish

| Event | Exchange | Routing key | Mode |
| ----- | -------- | ----------- | ---- |
| `ai.appointment_recommendation_created` | `analytics.events` | `ai.appointment_recommendation_created` | direct/outbox |
| `analytics.company_rating_updated` | `analytics.events` | `analytics.company_rating_updated` | direct/outbox |

`ai.job_failed` — publisher defined, **not invoked**.

## Consume

| Event | Queue | Notes |
| ----- | ----- | ----- |
| `appointment.requested` | `ai-service.q` | full handler + publish |
| `review.received` | `ai-service.q` | full handler + publish |
| other `appointment.*` | `ai-service.q` | count only if `companyId` present |
