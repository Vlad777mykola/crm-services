# Messaging Service Inventory

## Current status

**CURRENT VERIFIED**

This matrix was built from source code inspection (DOC-01). Re-verify after any messaging change.

Last verified against: repository code audit, August 2026.

---

## Summary table

| Service | Publishes | Consumes | Outbox | Queue | Exchanges | DB schema | Notes |
| ------- | --------- | -------- | ------ | ----- | --------- | --------- | ----- |
| [auth-service](./services/auth-service/) | `auth.user_registered` | `company-member.added`, `company-member.removed` | yes (`auth_schema.outbox_events`) | `auth-service.q` | `domain.events` | `auth_schema` | Consumer + publisher |
| [users-service](./services/users-service/) | — | `auth.user_registered` | table exists, unused | `users-service.q` | `domain.events` | `users_schema` | Consumer only |
| [companies-service](./services/companies-service/) | `company.created`, `company.updated` | `ai.company_insight_created` | yes | `companies-service.q` | `domain.events`, `analytics.events` | `companies_schema` | No publisher for `ai.company_insight_created` found in ai-service |
| [company-members-service](./services/company-members-service/) | `company-member.added`, `company-member.removed` | `company.created` | yes | `company-members-service.q` | `domain.events` | `company_members_schema` | May emit `company-member.added` when handling `company.created` |
| [specialists-service](./services/specialists-service/) | `specialist.created`, `specialist.updated` | — | yes | — | — | `specialists_schema` | Outbox only; no RabbitMQ process |
| [company-specialists-service](./services/company-specialists-service/) | `company-specialist.accepted` | — | yes | — | — | `company_specialists_schema` | Outbox only; no RabbitMQ process |
| [services-catalog-service](./services/services-catalog-service/) | `service.created`, `service.updated`, `specialist-service.assigned`, `specialist-service.removed` | — | yes | — | — | `services_schema` | Outbox only; no RabbitMQ process |
| [appointments-service](./services/appointments-service/) | 5 appointment lifecycle events | 9 projection + 1 analytics events | yes | `appointments-service.q` | `domain.events`, `analytics.events` | `appointments_schema` | Largest consumer binding set |
| [reviews-service](./services/reviews-service/) | `review.received` | — | yes | — | — | `reviews_schema` | Outbox only; no RabbitMQ process |
| [dashboard-service](./services/dashboard-service/) | — | — | — | — | — | shared `crm` DB | HTTP-only; no RabbitMQ |
| [notifications-service](./services/notifications-service/) | — | `appointment.*`, `review.received`, `analytics.company_rating_updated` | — | `notifications-service.q` | `domain.events`, `analytics.events` | `notifications_schema` | Consumer only |
| [ai-service](./services/ai-service/) | `analytics.company_rating_updated`, `ai.appointment_recommendation_created` | `appointment.*`, `review.received` | optional (`ai_schema.outbox_events`) | `ai-service.q` | `domain.events`, `analytics.events` | `ai` (postgres-ai) | `MESSAGING_MODE`: direct (default) or outbox |
| [metrics-service](./services/metrics-service/) | — | all on `domain.events` + `analytics.events` (`#`) | — | `metrics-service.q` | `domain.events`, `analytics.events` | none (in-memory) | Observer only; no idempotency |
| [outbox-publisher](./services/outbox-publisher/) | publishes pending outbox rows | — | reads `{schema}.outbox_events` | — | all 5 exchanges | per deployment | Separate instance per schema |
| [rabbitmq-lab-service](./services/rabbitmq-lab-service/) | lab-only `hello` message | its own | none | `student.rabbitmq-lab.hello.q` | `student.rabbitmq-lab.*` (+ read-only `domain.events`/`analytics.events` planned) | none | **Student/dev-only — never deployed to production.** See [lab-service/START-HERE.md](./lab-service/START-HERE.md) |

---

## Shared exchanges (all durable topic)

| Exchange | Purpose |
| -------- | ------- |
| `domain.events` | Domain lifecycle facts |
| `analytics.events` | AI/analytics results |
| `commands` | Reserved for future command-style messages |
| `domain.events.dlx` | Dead-letter target for domain queues |
| `commands.dlx` | Dead-letter target for commands |

Declared independently by each RabbitMQ-connected service. See `services/*/src/rabbitmq/topology.ts`.

---

## Outbox publisher deployments

Each schema with `outbox_events` gets a dedicated `outbox-publisher` instance (see `docker/dev/compose.services.yml`):

| OUTBOX_SCHEMA | Service |
| ------------- | ------- |
| `auth_schema` | auth-service |
| `companies_schema` | companies-service |
| `company_members_schema` | company-members-service |
| `specialists_schema` | specialists-service |
| `company_specialists_schema` | company-specialists-service |
| `services_schema` | services-catalog-service |
| `appointments_schema` | appointments-service |
| `reviews_schema` | reviews-service |
| `ai_schema` | ai-service (when `MESSAGING_MODE=outbox`) |

---

## Event flow map (verified bindings)

### Example A — Registration

```text
HTTP POST /auth/register
  → auth-service (business TX + outbox row)
  → auth_schema.outbox_events
  → outbox-publisher-auth
  → domain.events / auth.user_registered
  → users-service.q
  → users-service (processed_events + profile creation)
```

### Example B — Appointment requested

```text
HTTP POST /appointments (request)
  → appointments-service (business TX + outbox row)
  → appointments_schema.outbox_events
  → outbox-publisher-appointments
  → domain.events / appointment.requested
  ├─ notifications-service.q → email simulation
  ├─ ai-service.q → recommendation handler
  └─ metrics-service.q → counter increment
```

### Example C — AI analytics result

```text
ai-service (review_received handler)
  → analytics.events / analytics.company_rating_updated
  ├─ notifications-service.q
  └─ metrics-service.q

ai-service (appointment_requested handler)
  → analytics.events / ai.appointment_recommendation_created
  ├─ appointments-service.q → projection
  └─ metrics-service.q
```

---

## Verified gaps (code facts, not doc errors)

| Item | Status |
| ---- | ------ |
| `ai.company_insight_created` | Consumed by companies-service; **no publisher found** in ai-service source |
| `ai.job_failed` | Publisher function exists; **no handler invokes it** |
| `company-member.role_changed` | Schema exists; **not published** |
| `company-specialist.removed` | Schema exists; outbox comment says **not published** |
| `specialist.created` / `specialist.updated` / `company-specialist.accepted` | Published via outbox; appointments-service has **no bindings** for them |
| `users-service` outbox | Table exists; **no publish code** |
| `event-delivery` | RFC2 skeleton; delivery loop **not implemented** |

---

## Per-service detail links

| Service | Detail |
| ------- | ------ |
| auth-service | [README](./services/auth-service/README.md) · [EVENTS](./services/auth-service/EVENTS.md) |
| users-service | [README](./services/users-service/README.md) · [EVENTS](./services/users-service/EVENTS.md) |
| companies-service | [README](./services/companies-service/README.md) · [EVENTS](./services/companies-service/EVENTS.md) |
| company-members-service | [README](./services/company-members-service/README.md) · [EVENTS](./services/company-members-service/EVENTS.md) |
| specialists-service | [README](./services/specialists-service/README.md) · [EVENTS](./services/specialists-service/EVENTS.md) |
| company-specialists-service | [README](./services/company-specialists-service/README.md) · [EVENTS](./services/company-specialists-service/EVENTS.md) |
| services-catalog-service | [README](./services/services-catalog-service/README.md) · [EVENTS](./services/services-catalog-service/EVENTS.md) |
| appointments-service | [README](./services/appointments-service/README.md) · [EVENTS](./services/appointments-service/EVENTS.md) |
| reviews-service | [README](./services/reviews-service/README.md) · [EVENTS](./services/reviews-service/EVENTS.md) |
| dashboard-service | [README](./services/dashboard-service/README.md) |
| notifications-service | [README](./services/notifications-service/README.md) · [EVENTS](./services/notifications-service/EVENTS.md) |
| ai-service | [README](./services/ai-service/README.md) · [EVENTS](./services/ai-service/EVENTS.md) |
| metrics-service | [README](./services/metrics-service/README.md) · [EVENTS](./services/metrics-service/EVENTS.md) |
| outbox-publisher | [README](./services/outbox-publisher/README.md) · [EVENTS](./services/outbox-publisher/EVENTS.md) |
| rabbitmq-lab-service | [README](./services/rabbitmq-lab-service/README.md) · [EVENTS](./services/rabbitmq-lab-service/EVENTS.md) · [lab-service syllabus](./lab-service/START-HERE.md) |

---

## RFC2 note

**TARGET RFC2 — NOT CURRENT**

`services/event-delivery/` is a skeleton for broker-neutral `outbox_deliveries`. It is not part of the current runtime. See [common/19-rfc2-broker-neutral.md](./common/19-rfc2-broker-neutral.md).
