# RabbitMQ in CRM Services

The single complete overview of how asynchronous messaging works in this repository.

## Current status

**CURRENT VERIFIED** — sections labeled otherwise describe targets, not current runtime.

---

## 1. Who should read this

| Audience | Start here | Then |
| -------- | ---------- | ---- |
| **Students (new to RabbitMQ)** | [RabbitMQ Lab Service — hands-on, isolated](./lab-service/START-HERE.md) | [Learning path](./common/01-learning-path.md), then service `LEARN.md` files |
| **Students (know RabbitMQ basics)** | [Learning path](./common/01-learning-path.md) | Service `LEARN.md` files |
| **Developers** | [Add new event](./common/14-add-new-event.md) | Service `DEVELOPER.md` files |
| **Operators** | [Local development](./common/09-local-development.md) | [Operations](./common/12-operations.md) |

---

## 2. What problem RabbitMQ solves here

Microservices must react to facts that happen in other services without tight HTTP coupling. When a user registers in `auth-service`, `users-service` must create a profile — but `auth-service` should not make a synchronous HTTP call that fails if `users-service` is down.

RabbitMQ carries **past-tense domain events** (facts that already happened) between services. Delivery is **at-least-once**; consumers use **idempotency** so duplicates are safe.

---

## 3. HTTP vs asynchronous events

| HTTP | RabbitMQ event |
| ---- | -------------- |
| Request/response, caller waits | Fire-and-forget fact propagation |
| Caller needs immediate answer | Downstream reacts when ready |
| Tight coupling to callee availability | Decoupled via broker + queue |
| Used for user-facing API | Used for cross-service reactions |

Example: `POST /auth/register` returns immediately. `auth.user_registered` is written to outbox in the same DB transaction, then published asynchronously.

---

## 4. Complete repository messaging diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         HTTP API services                                │
│  auth · users · companies · appointments · reviews · specialists · …   │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ business TX + outbox_events row (same commit)
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  outbox-publisher (one instance per schema)                              │
│  polls pending rows → publishes envelope to exchange/routingKey          │
└───────────────┬─────────────────────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
  domain.events   analytics.events
  (topic)         (topic)
        │               │
        ├─ users-service.q
        ├─ auth-service.q
        ├─ company-members-service.q
        ├─ appointments-service.q
        ├─ notifications-service.q
        ├─ ai-service.q
        └─ metrics-service.q (# wildcard)
```

`ai-service` can also publish directly to `analytics.events` (default `MESSAGING_MODE=direct`) or via outbox when `MESSAGING_MODE=outbox`.

---

## 5. Current architecture

- **Broker:** RabbitMQ 3 (management image in local dev)
- **Pattern:** Transactional outbox for domain publishers; separate `outbox-publisher` per schema
- **Exchanges:** `domain.events`, `analytics.events`, `commands` (+ DLX pair)
- **Consumers:** One queue per consuming service, manual ACK, `processed_events` idempotency, `connectManaged` lifecycle (`@crm/messaging-kit`)
- **Failure (current):** `handleConsumerFailure()` → retry tiers (5s/30s/5m) → parking; metrics-service drops failures; outbox publisher retries with backoff
- **Readiness:** `isReady()` after full consumer setup — not TCP-only ([22-connection-lifecycle.md](./common/22-connection-lifecycle.md))
- **Not in runtime:** Kafka, RFC2 `event-delivery` delivery loop

See [SERVICES.md](./SERVICES.md) for the verified per-service matrix.

---

## 6. Event envelope

Every message uses [`contracts/events/envelope.v1.json`](../../contracts/events/envelope.v1.json):

```json
{
  "id": "uuid",
  "type": "auth.user_registered",
  "source": "auth-service",
  "version": "1.0",
  "time": "2026-01-15T10:00:00.000Z",
  "correlationId": "request-or-parent-event-id",
  "data": { }
}
```

Rules: unique `id`, past-tense `type`, safe `data` only (IDs and summaries — never secrets).

---

## 7. Event payload contracts

Payload schemas live in [`contracts/events/`](../../contracts/events/). File naming: `<event.type>.v<major>.json`. The envelope `data` field must validate against the schema for that event type.

Contract-first rule: no new publisher/consumer without a schema file. See [Event contracts](./common/04-event-contracts.md).

---

## 8. Topic exchanges

| Exchange | Type | Durable | Purpose |
| -------- | ---- | ------- | ------- |
| `domain.events` | topic | yes | Business lifecycle facts |
| `analytics.events` | topic | yes | AI/analytics results |
| `commands` | topic | yes | Reserved |
| `domain.events.dlx` | topic | yes | Dead letters from domain queues |
| `commands.dlx` | topic | yes | Reserved DLX |

---

## 9. Routing keys

Routing keys match event types: `auth.user_registered`, `appointment.requested`, `analytics.company_rating_updated`.

Topic bindings use exact keys or patterns:

- `auth.user_registered` — exact
- `appointment.*` — all appointment lifecycle events
- `#` — all messages (metrics-service observer)

---

## 10. Queues

Each consuming service owns one main queue:

| Queue | Service |
| ----- | ------- |
| `auth-service.q` | auth-service |
| `users-service.q` | users-service |
| `companies-service.q` | companies-service |
| `company-members-service.q` | company-members-service |
| `appointments-service.q` | appointments-service |
| `notifications-service.q` | notifications-service |
| `ai-service.q` | ai-service |
| `metrics-service.q` | metrics-service |

Publisher-only services (specialists, reviews, etc.) have no queue — `outbox-publisher` delivers to exchanges.

---

## 11. Bindings

Bindings connect exchanges to queues. Example from `users-service`:

- Queue: `users-service.q`
- Exchange: `domain.events`
- Routing key: `auth.user_registered`

Full binding list: [Routing topology](./common/07-routing-topology.md) and per-service [EVENTS.md](./services/) files.

---

## 12. Publishing flow

1. HTTP handler starts DB transaction
2. Business rows written
3. `outbox_events` row inserted (`status=pending`, `exchange`, `routingKey`, payload)
4. Transaction commits
5. `outbox-publisher` polls pending rows
6. Publishes JSON envelope to RabbitMQ
7. Marks row `published` (or retries on failure)

**Never** publish to RabbitMQ directly from an HTTP handler for domain events.

---

## 13. Transactional outbox

The outbox guarantees: if the business transaction committed, the event will eventually reach the broker (or land in `failed` status for inspection).

Table shape (per schema): `outbox_events` with columns for `event_id`, `event_type`, `exchange`, `routing_key`, `payload`, `status`, `attempts`, `next_retry_at`.

Details: [Publishing and outbox](./common/05-publishing-and-outbox.md).

---

## 14. Outbox publisher

Service: [`services/outbox-publisher/`](../../services/outbox-publisher/)

- One deployment per `OUTBOX_SCHEMA` (e.g. `auth_schema`, `appointments_schema`)
- Env: `DATABASE_URL`, `OUTBOX_SCHEMA`, `RABBITMQ_URL`, `POLL_INTERVAL_MS`, `BATCH_SIZE`, `MAX_ATTEMPTS`
- Declares all exchanges + `outbox.dead.q`

Guide: [outbox-publisher service docs](./services/outbox-publisher/README.md).

---

## 15. Consumer flow

1. Message arrives on service queue
2. Parse and validate envelope
3. BEGIN database transaction
4. INSERT into `processed_events` (skip if duplicate → COMMIT → ACK)
5. Run business handler
6. COMMIT
7. ACK message

On failure: ROLLBACK → `handleConsumerFailure()` (retry tiers or parking) → ACK original on main queue.

Connection lifecycle: [22-connection-lifecycle.md](./common/22-connection-lifecycle.md).

Details: [Consuming and idempotency](./common/06-consuming-and-idempotency.md).

---

## 16. Idempotency / processed_events

Every DB-backed consumer has:

```sql
processed_events (event_id, consumer_name, processed_at)
```

Duplicate `event_id` for the same `consumer_name` → ACK and skip handler.

---

## 17. ACK/NACK semantics

| Action | When | Effect |
| ------ | ---- | ------ |
| ACK | After successful DB commit | Message removed from queue |
| `handleConsumerFailure()` | Handler/TX failure (DB consumers) | Republish to retry tier or parking; ACK original |
| NACK (requeue=false) | metrics-service observer failures | Message dropped (no retry topology) |

ACK **after** commit, never before.

---

## 18. Current failure handling

**CURRENT VERIFIED**

- DB-backed consumer failure → `handleConsumerFailure()` → retry tiers → parking
- Channel death → `invalidate()` → full reconnect ([22-connection-lifecycle.md](./common/22-connection-lifecycle.md))
- Dead-letter queues remain for inspection / CLI compatibility
- Outbox publish failure → increment `attempts`, schedule `next_retry_at`, mark `failed` after `MAX_ATTEMPTS`
- metrics-service: no retry topology; failed messages dropped (observational only)

---

## 19. Retry tiers and parking (implemented)

**CURRENT VERIFIED**

`@crm/messaging-kit` provides retry tiers (`5s`, `30s`, `5m`) and parking queues. Node DB-backed consumers call `handleConsumerFailure()` to republish to the next tier before ACKing away from the main queue.

See [Retries, DLQ, parking](./common/08-retries-dlq-parking.md) and [RFC1 target](./common/18-rfc1-target.md).

---

## 20. DLQ / parking queues

**CURRENT VERIFIED:** retry tier queues + `{service}.{domain|analytics}.parking.q` per consumer; dead-letter queues (`auth.dead.q`, `users.dead.q`, …) for inspection.

CLI: `scripts/messaging/cli.mjs`, `yarn messaging:dlq:list`.

---

## 21. Correlation / causation

`correlationId` in the envelope links events in a chain. Producers should propagate the HTTP request ID or parent event ID. Helpers in `@crm/messaging-kit` (`resolveCorrelationId`).

---

## 22. AI messaging

`ai-service` consumes `appointment.*` and `review.received` from `domain.events`.

- `appointment.requested` → publishes `ai.appointment_recommendation_created` to `analytics.events`
- `review.received` → publishes `analytics.company_rating_updated` to `analytics.events`
- Other `appointment.*` events increment counters only (no publish)
- `MESSAGING_MODE`: `direct` (default) or `outbox`

Guide: [ai-service](./services/ai-service/README.md).

---

## 23. Metrics messaging

`metrics-service` binds `#` on both exchanges. In-memory counters per `eventType` + `exchange`. No idempotency, no DB — purely observational.

---

## 24. Complete service/event map

See [SERVICES.md](./SERVICES.md) for the verified matrix and [event catalog](../../architecture/event-catalog.md) for contract status.

---

## 25. How to add a new event

[common/14-add-new-event.md](./common/14-add-new-event.md) — 20-step procedure from business fact to documentation update.

---

## 26. How to add a consumer

[common/15-add-new-consumer.md](./common/15-add-new-consumer.md)

---

## 27. How to add messaging to a new service

[common/16-add-new-service.md](./common/16-add-new-service.md)

---

## 28. How to test messaging

[common/10-testing.md](./common/10-testing.md)

---

## 29. How to debug messaging

[common/11-debugging.md](./common/11-debugging.md)

---

## 30. RabbitMQ Management UI

Local: http://localhost:15672

- User: `crm`
- Password: `crm_local_only`
- Vhost: `crm-dev`

Start broker: `docker compose -f docker/dev/compose.infra.yml --profile events up`

---

## 31. Local development

[common/09-local-development.md](./common/09-local-development.md)

`RABBITMQ_URL=amqp://crm:crm_local_only@localhost:5672/crm-dev` (from `env/dev/common.env`).

---

## 32. Verify environment

```powershell
# From repo root — verify env vars are set
node scripts/dev/verify-env.mjs
```

Services with RabbitMQ expose readiness checks that fail when the broker is unreachable. See per-service `OPERATIONS.md`.

---

## 33. Production rules

[common/13-production-rules.md](./common/13-production-rules.md)

---

## 34. What must never be done

- Publish RabbitMQ messages from HTTP handlers (use outbox)
- ACK before DB commit
- Assume exactly-once delivery
- Change event payload without updating JSON Schema
- Add routing keys without declaring bindings
- Teach or implement a generic MessageBus that hides broker semantics
- Put Kafka topic names in domain code

---

## 35. RFC1 target

[common/18-rfc1-target.md](./common/18-rfc1-target.md)

---

## 36. RFC2 target

[common/19-rfc2-broker-neutral.md](./common/19-rfc2-broker-neutral.md)

---

## 37. Kafka readiness

[common/20-kafka-readiness.md](./common/20-kafka-readiness.md)

Kafka is **not** part of the current default runtime.

---

## 38. Glossary

[GLOSSARY.md](./GLOSSARY.md)

---

## 39. Links to every service guide

| Service | README | LEARN | EVENTS | DEVELOPER | TESTING | OPERATIONS |
| ------- | ------ | ----- | ------ | --------- | ------- | ---------- |
| auth-service | [README](./services/auth-service/README.md) | [LEARN](./services/auth-service/LEARN.md) | [EVENTS](./services/auth-service/EVENTS.md) | [DEV](./services/auth-service/DEVELOPER.md) | [TEST](./services/auth-service/TESTING.md) | [OPS](./services/auth-service/OPERATIONS.md) |
| users-service | [README](./services/users-service/README.md) | [LEARN](./services/users-service/LEARN.md) | [EVENTS](./services/users-service/EVENTS.md) | [DEV](./services/users-service/DEVELOPER.md) | [TEST](./services/users-service/TESTING.md) | [OPS](./services/users-service/OPERATIONS.md) |
| companies-service | [README](./services/companies-service/README.md) | [LEARN](./services/companies-service/LEARN.md) | [EVENTS](./services/companies-service/EVENTS.md) | [DEV](./services/companies-service/DEVELOPER.md) | [TEST](./services/companies-service/TESTING.md) | [OPS](./services/companies-service/OPERATIONS.md) |
| company-members-service | [README](./services/company-members-service/README.md) | [LEARN](./services/company-members-service/LEARN.md) | [EVENTS](./services/company-members-service/EVENTS.md) | [DEV](./services/company-members-service/DEVELOPER.md) | [TEST](./services/company-members-service/TESTING.md) | [OPS](./services/company-members-service/OPERATIONS.md) |
| specialists-service | [README](./services/specialists-service/README.md) | [LEARN](./services/specialists-service/LEARN.md) | [EVENTS](./services/specialists-service/EVENTS.md) | [DEV](./services/specialists-service/DEVELOPER.md) | [TEST](./services/specialists-service/TESTING.md) | [OPS](./services/specialists-service/OPERATIONS.md) |
| company-specialists-service | [README](./services/company-specialists-service/README.md) | [LEARN](./services/company-specialists-service/LEARN.md) | [EVENTS](./services/company-specialists-service/EVENTS.md) | [DEV](./services/company-specialists-service/DEVELOPER.md) | [TEST](./services/company-specialists-service/TESTING.md) | [OPS](./services/company-specialists-service/OPERATIONS.md) |
| services-catalog-service | [README](./services/services-catalog-service/README.md) | [LEARN](./services/services-catalog-service/LEARN.md) | [EVENTS](./services/services-catalog-service/EVENTS.md) | [DEV](./services/services-catalog-service/DEVELOPER.md) | [TEST](./services/services-catalog-service/TESTING.md) | [OPS](./services/services-catalog-service/OPERATIONS.md) |
| appointments-service | [README](./services/appointments-service/README.md) | [LEARN](./services/appointments-service/LEARN.md) | [EVENTS](./services/appointments-service/EVENTS.md) | [DEV](./services/appointments-service/DEVELOPER.md) | [TEST](./services/appointments-service/TESTING.md) | [OPS](./services/appointments-service/OPERATIONS.md) |
| reviews-service | [README](./services/reviews-service/README.md) | [LEARN](./services/reviews-service/LEARN.md) | [EVENTS](./services/reviews-service/EVENTS.md) | [DEV](./services/reviews-service/DEVELOPER.md) | [TEST](./services/reviews-service/TESTING.md) | [OPS](./services/reviews-service/OPERATIONS.md) |
| dashboard-service | [README](./services/dashboard-service/README.md) | [LEARN](./services/dashboard-service/LEARN.md) | [EVENTS](./services/dashboard-service/EVENTS.md) | [DEV](./services/dashboard-service/DEVELOPER.md) | [TEST](./services/dashboard-service/TESTING.md) | [OPS](./services/dashboard-service/OPERATIONS.md) |
| notifications-service | [README](./services/notifications-service/README.md) | [LEARN](./services/notifications-service/LEARN.md) | [EVENTS](./services/notifications-service/EVENTS.md) | [DEV](./services/notifications-service/DEVELOPER.md) | [TEST](./services/notifications-service/TESTING.md) | [OPS](./services/notifications-service/OPERATIONS.md) |
| ai-service | [README](./services/ai-service/README.md) | [LEARN](./services/ai-service/LEARN.md) | [EVENTS](./services/ai-service/EVENTS.md) | [DEV](./services/ai-service/DEVELOPER.md) | [TEST](./services/ai-service/TESTING.md) | [OPS](./services/ai-service/OPERATIONS.md) |
| metrics-service | [README](./services/metrics-service/README.md) | [LEARN](./services/metrics-service/LEARN.md) | [EVENTS](./services/metrics-service/EVENTS.md) | [DEV](./services/metrics-service/DEVELOPER.md) | [TEST](./services/metrics-service/TESTING.md) | [OPS](./services/metrics-service/OPERATIONS.md) |
| outbox-publisher | [README](./services/outbox-publisher/README.md) | [LEARN](./services/outbox-publisher/LEARN.md) | [EVENTS](./services/outbox-publisher/EVENTS.md) | [DEV](./services/outbox-publisher/DEVELOPER.md) | [TEST](./services/outbox-publisher/TESTING.md) | [OPS](./services/outbox-publisher/OPERATIONS.md) |

---

## Maintenance

Implementation plan and task tracker: [DOCUMENTATION-IMPLEMENTATION-PLAN.md](./DOCUMENTATION-IMPLEMENTATION-PLAN.md)

Architecture guardrails: [21-architecture-guardrails.md](./common/21-architecture-guardrails.md) · `yarn verify:architecture`

If you change messaging code, update docs in the same PR (Rule 11) and pass architecture checks.
