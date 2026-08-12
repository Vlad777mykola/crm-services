# users-service

## Purpose

Owns user profile data (name, phone, city, bio) — extracted from
`backend/src/modules/users/` in Phase 2 of
`docs/architecture/microservices-extraction-checklist.md`. **Phase 2 scope:
consumer-only.** It creates a profile idempotently when auth-service
publishes `auth.user_registered`; it has no HTTP API yet. `GET /users/me`,
`PATCH /users/me`, `GET /users/:id` land in Phase 3.

## Owned routes

None yet — see "Current migration status" below. `/users/*` stays on
legacy-backend until Phase 3.

## Owned tables / schema

`users_schema` (same physical Postgres instance as legacy-backend, own
schema namespace — see `docs/architecture/table-ownership-matrix.md`):

- `users` — `id` (== auth-service's `auth_identities.id`), `email`, `status`.
- `user_profiles` — `userId` (FK to `users.id`), `name`, `phone`, `city`, `bio`.
- `processed_events` — idempotency ledger for this service's consumer.
- `outbox_events` — reserved for Phase 3 (`user.profile_created`/`updated`,
  if confirmed); not written to yet.

## Consumed events

| Event | What happens |
|---|---|
| `auth.user_registered` | Creates a `users` row + `user_profiles` row (`name` from the event payload) if they don't already exist. Idempotent via `processed_events` + `ON CONFLICT DO NOTHING`. Schema: `contracts/events/auth.user_registered.v1.json`. |

## Published events

None yet.

## Required environment variables

| Variable | Purpose | Example/default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgres://postgres:postgres@localhost:5432/crm` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://crm:crm_local_only@localhost:5672` |
| `HEALTH_PORT` | Health-check HTTP port (this service has no other HTTP surface in Phase 2) | `4002` |
| `LOG_LEVEL` | pino level | `info` |

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/users-service/Dockerfile -t crm-users-service services/users-service
    docker run -p 4002:4002 --env-file .env crm-users-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 2 as a consumer only — no gateway route points here yet.
`/users/*` keeps being served by legacy-backend until Phase 3 adds
`GET /users/me`, `PATCH /users/me`, `GET /users/:id` and the gateway is
updated to route them here. Rollback: nothing to roll back at the gateway
level yet (no routes point here); if this service is stopped, the
`auth.user_registered` events it missed sit in RabbitMQ (redelivered once it
reconnects) or, if the queue itself is gone, are simply not reflected as
profiles until the next registration — legacy-backend is unaffected either
way since it has its own, separate `users` table.
