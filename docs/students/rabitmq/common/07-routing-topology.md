# Routing Topology

## Current status

**CURRENT VERIFIED**

---

## Exchanges (all services declare these)

| Exchange | Type | Durable |
| -------- | ---- | ------- |
| `domain.events` | topic | yes |
| `analytics.events` | topic | yes |
| `commands` | topic | yes |
| `domain.events.dlx` | topic | yes |
| `commands.dlx` | topic | yes |

---

## Consumer queues and bindings

| Queue | Exchange | Routing keys / pattern |
| ----- | -------- | ---------------------- |
| `users-service.q` | `domain.events` | `auth.user_registered` |
| `auth-service.q` | `domain.events` | `company-member.added`, `company-member.removed` |
| `company-members-service.q` | `domain.events` | `company.created` |
| `companies-service.q` | `analytics.events` | `ai.company_insight_created` |
| `appointments-service.q` | `domain.events` | `company.created`, `company.updated`, `company-member.added`, `company-member.removed`, `service.created`, `service.updated`, `specialist-service.assigned`, `specialist-service.removed` |
| `appointments-service.q` | `analytics.events` | `ai.appointment_recommendation_created` |
| `notifications-service.q` | `domain.events` | `appointment.*`, `review.received` |
| `notifications-service.q` | `analytics.events` | `analytics.company_rating_updated` |
| `ai-service.q` | `domain.events` | `appointment.*`, `review.received` |
| `metrics-service.q` | `domain.events` | `#` |
| `metrics-service.q` | `analytics.events` | `#` |

Queue options: durable, `x-dead-letter-exchange: domain.events.dlx` (except metrics-service).

---

## Dead-letter queues

| Dead queue | Bound to DLX |
| ---------- | ------------ |
| `auth.dead.q` | `domain.events.dlx` `#` |
| `users.dead.q` | `domain.events.dlx` `#` |
| `companies.dead.q` | `domain.events.dlx` `#` |
| `company-members.dead.q` | `domain.events.dlx` `#` |
| `appointments.dead.q` | `domain.events.dlx` `#` |
| `notifications.dead.q` | `domain.events.dlx` `#` |
| `ai.dead.q` | `domain.events.dlx` `#` |
| `outbox.dead.q` | `domain.events.dlx` `#` |

---

## Published events (outbox → exchange)

All publisher-only services route to `domain.events` with routing key = event type. See per-service [EVENTS.md](../services/) files.

---

## Gaps (verified)

These events are **published** but have **no consumer binding** in appointments-service:

- `specialist.created`, `specialist.updated`, `company-specialist.accepted`

`ai.company_insight_created` is consumed by companies-service but **no publisher found** in ai-service.

---

## CURRENT retry topology

**CURRENT VERIFIED** — Node DB-backed consumers.

Per service: `{service}.domain.retry.5s.q`, `30s`, `5m`, `{service}.domain.parking.q` — declared by `declareRetryTopology()` in `@crm/messaging-kit`. Analytics consumers use `analytics` in the name segment.

See [08-retries-dlq-parking.md](./08-retries-dlq-parking.md) and [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Next

[08-retries-dlq-parking.md](./08-retries-dlq-parking.md)
