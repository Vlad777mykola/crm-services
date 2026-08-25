# CQRS / DDD Migration Plan

This repository should migrate architecture first, not framework first. Existing
Express services can adopt the same application/domain/infrastructure boundaries
as future NestJS services without changing external behavior.

## Rules

1. Keep HTTP paths, response contracts, event names, routing keys, schemas,
   health endpoints, environment variables, and database ownership unchanged
   during internal refactors.
2. Commands are internal service requests that change state. They must not be
   used as cross-service calls.
3. Queries are internal service requests that read state and return view models.
   They may read directly from Postgres/read repositories.
4. Domain events are local facts inside one bounded context. Integration events
   are the events written to `outbox_events` and later published to RabbitMQ.
5. Application/core services must not publish directly to RabbitMQ. Persist the
   business change and the integration event in the same transaction, then let
   `outbox-publisher` deliver it.
6. Every RabbitMQ consumer that writes data keeps using `processed_events` for
   idempotency and the existing retry/parking behavior from `@crm/messaging-kit`.
7. Do not force rich DDD into projection or infrastructure services.

## Target Shape

```text
src/
  entrypoints/
    http/
    rabbitmq/

  application/
    commands/
    queries/
    event-handlers/
    services/
    ports/

  domain/
    entities/
    value-objects/
    events/
    repositories/

  infrastructure/
    persistence/
      typeorm/
    read-model/
    messaging/
    outbox/

  bootstrap/
```

Existing Express services may keep `src/http` and `src/rabbitmq` as their
entrypoints while the lower layers move toward this shape. NestJS services may
use controllers/modules at the entrypoint, but should keep the same application,
domain, and infrastructure ideas below it.

## Service Profiles

| Profile | Services | Target |
|---|---|---|
| Rich domain | `appointments-service`, `companies-service`, `company-members-service`, `services-catalog-service` | CQRS + domain entities/value objects + repositories + outbox |
| CQRS lite | `notifications-service`, `reviews-service`, `specialists-service`, `users-service`, `company-specialists-service` | Commands, queries, event handlers, application services, repositories; entities only where business rules justify them |
| Projection / infrastructure | `dashboard-service`, `metrics-service`, `outbox-publisher`, `messaging-kit`, `event-delivery` | Read models, consumers, infrastructure code; no fake DDD |

## Migration Order

1. `notifications-service`: keep Express; introduce CQRS-lite structure without
   RabbitMQ, DB, or HTTP contract changes.
2. `reviews-service`: optional NestJS pilot #1 because it has HTTP writes and
   outbox publishing but no RabbitMQ consumer.
3. `specialists-service`: optional NestJS pilot #2 with HTTP, queries, commands,
   and outbox publishing.
4. `company-specialists-service`: CQRS-lite.
5. `users-service`: CQRS-lite.
6. `company-members-service`: CQRS + richer domain.
7. `services-catalog-service`: CQRS + DDD.
8. `companies-service`: CQRS + DDD.
9. `appointments-service`: strong CQRS + DDD after the pattern is proven.
10. `auth-service`: leave until late unless there is a concrete reason to touch
    it.

## NestJS Decision Gate

After `reviews-service` and `specialists-service`, decide whether NestJS is
actually helping:

- clearer dependency injection
- less boilerplate
- better command/query organization
- easier onboarding
- easier tests
- no regressions in outbox, contracts, Docker, health, logging, or RabbitMQ
  conventions

If yes, new services can default to NestJS and existing services can migrate when
they are already being changed. If no, keep Express and the same CQRS/DDD
architecture.

## Current First Step

`notifications-service` is the template service for CQRS-lite on Express:

```text
HTTP route
  -> Command / Query handler
  -> repository port
  -> existing TypeORM repository

RabbitMQ consumer
  -> processed_events
  -> application event handler
  -> application service
  -> existing repositories
```

This gives us architectural consistency without a framework migration.

## Progress

| Step | Service | Status | Notes |
|---|---|---|---|
| 1 | `notifications-service` | Done | Express retained. HTTP commands/queries and RabbitMQ event handlers now route through `src/application`. No external contract changes. |
| 2 | `reviews-service` | Architecture prep done | Express retained for now. Create-review command, list-review queries, repository ports, appointment lookup port, and outbox port now live under `src/application`. Actual NestJS pilot remains a separate dependency/framework decision. |
| 3 | `specialists-service` | Architecture prep done | Express retained for now. Create/update commands, public/me/status/id queries, repository ports, and outbox port now live under `src/application`. Actual NestJS pilot remains a separate dependency/framework decision. |
| 4 | `company-specialists-service` | Architecture prep done | Express retained. Send/accept/reject commands, company/specialist-facing queries, repository ports, bridge lookup ports, and outbox port now live under `src/application`. |
| 5 | `users-service` | Architecture prep done | Express retained. User profile query/update command and `auth.user_registered` event handler now live under `src/application`; existing consumer tests still pass. |
| 6 | `company-members-service` | Architecture prep done | Express retained. Invite/update commands, list query, `company.created` event handler, user lookup bridge, guards, presenter, and outbox port now live under `src/application`. |
| 7 | `services-catalog-service` | Architecture prep done | Express retained. Service create/update and assignment/unassignment commands plus service/service-specialist queries now live under `src/application`. |
| 8 | `companies-service` | Architecture prep done | Express retained. Create/update commands, public/my/id/status queries, authorization helpers, outbox wrapper, and AI insight event handler now live under `src/application`. |
| 9 | `appointments-service` | Architecture prep done | Express retained. Create/respond/complete/cancel commands, company/client/status queries, authorization helper, outbox wrapper, response view model, and projection event handler now live under `src/application`. |
| 10 | `auth-service` | Architecture prep done | Express retained. Register/login/refresh/logout commands, current-identity query, identity view model, outbox wrapper, and membership projection event handler now live under `src/application`. |

## Open Risks Before NestJS Pilot

- Several services currently have no test files, so a framework migration would
  need either focused tests or a smoke checklist before changing bootstrap/router
  behavior. Verified missing-test packages during this pass include
  `reviews-service`, `specialists-service`, `company-specialists-service`,
  `company-members-service`, `services-catalog-service`, `companies-service`,
  `appointments-service`, and `auth-service`.
- NestJS dependencies are not installed in the service package today. Adding them
  should be a deliberate package/deployment change, not mixed into a behavior
  refactor.
- Keep the existing outbox and RabbitMQ conventions even if the HTTP framework
  changes.
