# Current Service Map

Snapshot of the deployable units that exist in this repository now. This file is
code-reality oriented; use it with `current-to-target-delta.md` when reading older
migration notes.

## Application Edge

| Unit | Location | Role |
|---|---|---|
| frontend | `frontend/` | React + Vite UI, served as static assets in Docker. |
| gateway | `services/gateway/` + `docker/*/traefik/` | Traefik routing layer. It routes public HTTP paths to the owning backend service. |

## Domain HTTP Services

All services below are Node.js services using Express, Zod validation, TypeORM,
Postgres, structured logging, and `/health/live` + `/health/ready` unless noted.

| Service | Location | Owns | Consumes | Publishes through outbox |
|---|---|---|---|---|
| auth-service | `services/auth-service/` | identity, sessions, JWT issuance, membership projection | `company-member.added`, `company-member.removed` | `auth.user_registered` |
| users-service | `services/users-service/` | users and user profiles | `auth.user_registered` | none active today |
| companies-service | `services/companies-service/` | company profiles, company status history, AI insight projections | `ai.company_insight_created` | `company.created`, `company.updated` |
| company-members-service | `services/company-members-service/` | company members and invitations | `company.created` | `company-member.added`, `company-member.removed` |
| specialists-service | `services/specialists-service/` | specialist profiles, specialist status history, public specialist discovery projections | company, company-specialist, service, specialist-service, and review events | `specialist.created`, `specialist.updated` |
| company-specialists-service | `services/company-specialists-service/` | company-specialist requests and accepted working relationships | none | `company-specialist.accepted` |
| services-catalog-service | `services/services-catalog-service/` | services, service-specialist assignments, service status history | none | `service.created`, `service.updated`, `specialist-service.assigned`, `specialist-service.removed` |
| appointments-service | `services/appointments-service/` | appointment lifecycle, status history, local company/member/service/specialist projections, AI recommendation projections | company, company-member, service, specialist-service, and AI recommendation events | `appointment.requested`, `appointment.approved`, `appointment.rejected`, `appointment.completed`, `appointment.cancelled` |
| reviews-service | `services/reviews-service/` | reviews | none | `review.received` |
| notifications-service | `services/notifications-service/` | notifications, email logs, processed events | `appointment.*`, `review.received`, `analytics.company_rating_updated` | none |
| dashboard-service | `services/dashboard-service/` | read-only dashboard summaries | none | none |

## Messaging / Infrastructure Services

| Service | Location | Role |
|---|---|---|
| outbox-publisher | `services/outbox-publisher/` | Polls one configured `outbox_events` table, publishes pending rows to RabbitMQ, and marks rows published/failed. The same image is intended to run once per owning schema. |
| metrics-service | `services/metrics-service/` | Observes `domain.events` and `analytics.events`, records RabbitMQ metrics, and exposes Prometheus `/metrics`. |
| ai-service | `services/ai-service/` | Python AI/analytics service with its own datastore. Consumes source events and publishes AI/analytics result events. |
| messaging-kit | `services/messaging-kit/` | Shared Node RabbitMQ infrastructure package: managed connection lifecycle, retry topology, reliable republish, consumer failure handling. |
| event-delivery | `services/event-delivery/` | RFC2 skeleton for broker-neutral delivery from `outbox_deliveries`; not the main production delivery path yet. |
| rabbitmq-lab-service | `services/rabbitmq-lab-service/` | Development/student-only RabbitMQ learning service. Not a CRM production service. |

## Common Runtime Pattern

```text
HTTP route
  -> module/application service
  -> TypeORM repository
  -> service-owned Postgres schema
  -> outbox_events row, when an integration event is needed
  -> outbox-publisher
  -> RabbitMQ
  -> consumer service
  -> processed_events idempotency
  -> local projection / side effect
```

## Architecture Status

Already present:

- independent service folders under `services/`
- per-service schemas and `processed_events` for DB-backed consumers
- RabbitMQ topic exchanges for domain and analytics events
- transactional outbox tables for publishing services
- event contracts in `contracts/events/`
- REST contracts in `contracts/openapi/`
- shared RabbitMQ infrastructure in `@crm/messaging-kit`

Still inconsistent:

- database migration ownership is mid-rollout: `users-service` and
  `specialists-service` own TypeORM migrations, while older services still rely
  on bootstrap DDL
- internal CQRS command/query/event-handler structure
- pure domain entities separated from TypeORM persistence entities
- read/write repository separation
- runtime validation at every inbound event boundary
- documentation freshness across older extraction-plan files

See `cqrs-ddd-migration-plan.md` for the current architecture-first migration
direction.
See `database-migrations.md` for the database migration rollout rules.
