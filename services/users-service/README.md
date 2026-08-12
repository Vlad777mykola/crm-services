# users-service

## Purpose

Owns user profile data (name, phone, city, bio) — extracted from
`backend/src/modules/users/` across Phase 2 (consumer) and Phase 3 (HTTP) of
`docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | Requires `Authorization: Bearer <accessToken>` (issued by auth-service). |
| PATCH | `/users/me` | Same. Body: `{ name?, phone?, city?, bio? }` (all optional, nullable except `name`). |
| GET | `/users/:id` | No auth required (matches legacy). |

`POST /users` is **not** implemented here — stays on legacy-backend per Q5
(`table-ownership-matrix.md` "Undecided ownership").

## Owned tables / schema

`users_schema` (same physical Postgres instance as legacy-backend, own
schema namespace — see `docs/architecture/table-ownership-matrix.md`):

- `users` — `id` (== auth-service's `auth_identities.id`), `email`, `status`.
- `user_profiles` — `userId` (FK to `users.id`), `name`, `phone`, `city`, `bio`.
- `processed_events` — idempotency ledger for the `auth.user_registered` consumer.
- `outbox_events` — reserved for future publishing (not written to yet).

## Consumed events

| Event | What happens |
|---|---|
| `auth.user_registered` | Creates a `users` row + `user_profiles` row (`name` from the event payload) if they don't already exist. Idempotent via `processed_events` + `ON CONFLICT DO NOTHING`. Schema: `contracts/events/auth.user_registered.v1.json`. |

## Published events

None yet.

## Required environment variables

| Variable | Purpose | Example/default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | HTTP port | `4002` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `DATABASE_URL` | Postgres connection string | `postgres://postgres:postgres@localhost:5432/crm` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://crm:crm_local_only@localhost:5672` |
| `JWT_ACCESS_SECRET` | **Must match auth-service's** — this service only verifies tokens, never issues them | `dev-access-secret-change-me` |
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

Extracted across Phase 2 (consumer) and Phase 3 (HTTP). `/users/me` and
`/users/:id` are routed here from the gateway; `POST /users` stays on
legacy-backend (Q5). Rollback: point the gateway's `/users/me`, `/users/:id`
routers back at `legacy-backend` — legacy's own `/users/*` code is untouched.
Any profiles created only in `users_schema` after cutover won't exist on
legacy, per the "no backfill" data policy
(`docs/architecture/table-ownership-matrix.md`).
