# Service Skeleton Standard

## Goal

One repeatable structure for every new Node.js microservice extracted from
`backend/`, so services don't each invent their own layout, error style, or logging
approach. Applies to every service created from Phase 2 onward (auth-service,
users-service, companies-service, company-members-service, specialists-service,
company-specialists-service, services-catalog-service, appointments-service,
reviews-service) and to the HTTP layer being added to the existing
`notifications-service` in Phase 11.

## Baseline: match existing conventions, don't invent a second one

`services/notifications-service/` and `services/outbox-publisher/` already establish
a working pattern in this repo. The standard below **extends** that pattern with an
HTTP layer (needed because those two services are consumer/publisher-only today,
while auth-service/companies-service/etc. need real REST APIs) rather than replacing
it. Specifically, `env.ts` and `logger.ts` stay flat at `src/` root — **not** nested
under `src/config/` — because that's the existing, working convention
(`services/notifications-service/src/env.ts`, `src/logger.ts`).

## Standard structure

```txt
services/<service-name>/
  package.json
  tsconfig.json
  Dockerfile              (see dockerfile-standard.md)
  .env.example
  README.md               (see template below)
  src/
    main.ts                -- entrypoint: load env, init DB, start HTTP + RabbitMQ, wire shutdown
    app.ts                 -- Express app factory (only for services with an HTTP API)
    env.ts                 -- zod-validated env schema (flat, matches existing services)
    logger.ts              -- pino logger instance (flat, matches existing services)
    http/                  -- only for services with an HTTP API
      routes/
        <domain>.routes.ts
      error-handler.ts
      not-found-handler.ts
      request-logger.ts    -- reads X-Request-Id, logs it
      health-server.ts      or health.routes.ts if mounted on the main app
    db/
      data-source.ts        -- TypeORM DataSource (Node services) or connection pool
      migrations/
      entities/             (Node/TypeORM services) or repository files (matches
                              existing flat repository-per-table pattern, e.g.
                              notification-repository.ts, email-log-repository.ts)
    modules/                -- business logic, one folder per bounded concern
      <domain>/
        <domain>.service.ts
        <domain>.schemas.ts
    rabbitmq/
      topology.ts           -- exchange/queue/binding declarations (matches existing
                              services/*/src/rabbitmq/topology.ts pattern)
      consumer.ts
      publisher.ts          (if this service publishes)
    outbox/
      outbox.service.ts      -- recordOutboxEvent(), mirrors
                              backend/src/infrastructure/outbox/outbox.service.ts
      outbox-event.entity.ts (or table definition, per this service's persistence style)
    idempotency/
      processed-events-repository.ts  -- matches existing
                                         services/notifications-service/src/idempotency/
```

## Rules

- Router/HTTP layer handles request parsing and response shaping only — no business
  logic in route handlers (matches `backend/src/modules/*/​*.routes.ts` today, which
  delegates to a `*.service.ts` function per route).
- The `modules/<domain>/*.service.ts` layer owns business logic.
- The `db/` layer owns persistence — no service reaches into another service's schema.
- **No imports from `backend/src/modules/*`.** Every extracted service is standalone,
  matching the existing rule already enforced for `notifications-service`,
  `outbox-publisher`, and `ai-service` (see
  `target-production-architecture.md`: "None of them import `backend/src/modules/*`").
- **No shared business-logic package.** Cross-cutting technical concerns (logger
  setup, error envelope shape, correlation-id helpers) may eventually justify a small
  `@crm/shared` npm package (see Q7 discussion in prior review) — but only for
  technical utilities, never business rules, and this is a separate, later decision,
  not a blocker for any phase in `microservices-extraction-checklist.md`.
- Contracts come from `contracts/events/` and `contracts/openapi.yaml` only — never
  from importing another service's TypeScript types.

## Middleware baseline (every service, no exceptions)

Every service — HTTP-facing or consumer-only — includes:

| Concern | File | Notes |
|---|---|---|
| JSON body parser | `app.ts` (`express.json()`) | HTTP services only |
| Request logger | `http/request-logger.ts` | Reads `X-Request-Id` from the incoming request (set by gateway per Phase 1 Task G), logs it with every request; generates one if missing (e.g. direct-to-service calls in local dev) |
| Error handler | `http/error-handler.ts` | Mirrors `backend/src/common/middleware/errorHandler.ts` — consistent JSON error envelope across every service |
| 404 handler | `http/not-found-handler.ts` | Mirrors `backend/src/common/middleware/notFoundHandler.ts` |
| `GET /health/live` | `http/health-server.ts` or mounted route | Process-alive check, never touches DB (matches `backend/src/modules/health/health.routes.ts` and every existing worker service) |
| `GET /health/ready` | same | Touches DB/broker connection; returns 503 if not ready |
| `X-Request-Id` propagation | request logger + any outbound calls this service makes | Carries the id through to logs and, where applicable, into published event `correlationId` |

This is a deliberately small baseline — not full tracing/observability (that's Phase
13). The goal here is that every service looks the same at a glance, not full
instrumentation.

## Per-service README (required, every service)

Every `services/<service-name>/README.md` must include:

```markdown
# <service-name>

## Purpose
One paragraph — what this service owns and why it exists as its own service.

## Owned routes
List every route this service serves (copy from route-inventory.md once routed here).

## Owned tables / schema
Schema name + table list (copy from table-ownership-matrix.md).

## Consumed events
Event type -> what it does when consumed.

## Published events
Event type -> when it's published.

## Required environment variables
Table: variable name, purpose, example/default.

## Local run
    yarn install
    yarn dev

## Docker run
    docker build -f services/<service-name>/Dockerfile -t crm-<service-name> services/<service-name>
    docker run -p <port>:<port> --env-file .env crm-<service-name>

## Health endpoints
GET /health/live
GET /health/ready

## Current migration status
Which phase extracted this service, what (if anything) still lives on legacy for
this domain, and the gateway rollback path.
```

This mirrors the existing pattern in `docker/README.md` and
`docs/architecture/target-production-architecture.md`, scoped down to one service.

## Done when

Every phase in `microservices-extraction-checklist.md` that creates a new service
references this document instead of re-describing the folder layout inline, and every
created service has a README following the template above before that phase's stop
point.
