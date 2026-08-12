# auth-service

## Purpose

Owns identity, password credentials, sessions, and JWT issuance for the whole
platform. Extracted from `backend/src/modules/auth/` in Phase 2 of
`docs/architecture/microservices-extraction-checklist.md` — the strangler
migration's first domain service. Publishes `auth.user_registered` so
users-service can create a profile; does not own profile fields (name, phone,
city, bio) — those move to users-service.

## Owned routes

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Creates an identity, issues a session + access token, publishes `auth.user_registered`. |
| POST | `/auth/login` | Verifies password, issues a session + access token. |
| POST | `/auth/refresh` | Rotates the refresh-token cookie, issues a new access token. |
| POST | `/auth/logout` | Revokes the current session. |
| GET | `/auth/me` | Returns the caller's minimal identity (`id`, `email`, `createdAt`) — **not** the full profile; see "Current migration status" below. |

Refresh-token cookie is `httpOnly`, path `/auth`, name from
`REFRESH_TOKEN_COOKIE_NAME` (default `refreshToken`) — same convention as
legacy so the frontend doesn't need to change how it reads/sends it.

## Owned tables / schema

`auth_schema` (same physical Postgres instance as legacy-backend, own schema
namespace — see `docs/architecture/table-ownership-matrix.md`):

- `auth_identities` — one row per (user, provider) pair. `id` is the
  canonical userId used everywhere (JWT `sub` claim, event payloads).
- `auth_sessions` — refresh-token session records (hash only, never the raw
  token).
- `auth_membership_projection` — empty placeholder, populated in Phase 5 from
  `company-member.*` events.
- `processed_events` — reserved ahead of Phase 5 (this service doesn't
  consume anything yet).
- `outbox_events` — written by `register()`, read by a dedicated
  `outbox-publisher` instance pointed at this schema (see Docker run below).

## Consumed events

None yet (Phase 5 adds `company-member.*` for the membership projection).

## Published events

| Event | When |
|---|---|
| `auth.user_registered` | On successful `POST /auth/register`, same DB transaction as the identity insert. Schema: `contracts/events/auth.user_registered.v1.json`. |

## Required environment variables

| Variable | Purpose | Example/default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | HTTP port | `4001` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `LOG_LEVEL` | pino level | `info` |
| `DATABASE_URL` | Postgres connection string | `postgres://postgres:postgres@localhost:5432/crm` |
| `JWT_ACCESS_SECRET` | **Must match legacy-backend's** `JWT_ACCESS_SECRET` exactly, so tokens this service issues are still accepted by not-yet-extracted legacy routes (Task 2.6) | `dev-access-secret-change-me` |
| `JWT_ACCESS_TTL_MINUTES` | Access token lifetime | `15` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh-token/session lifetime | `30` |
| `REFRESH_TOKEN_COOKIE_NAME` | Cookie name for the refresh token | `refreshToken` |

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/auth-service/Dockerfile -t crm-auth-service services/auth-service
    docker run -p 4001:4001 --env-file .env crm-auth-service

To publish `auth.user_registered`, also run a second `outbox-publisher`
instance pointed at this schema (Q8 — same image, different config):

    DATABASE_URL=postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dauth_schema
    HEALTH_PORT=4501

(the `search_path` option is required because `outbox-publisher` queries the
unqualified table name `outbox_events`, and this service's table lives in
`auth_schema`, not `public`.)

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 2. `/auth/*` is routed here from the gateway; every other
route stays on legacy-backend. Rollback: point the gateway's `/auth/*` router
back at `legacy-backend` (its own `/auth/*` code is untouched, so it keeps
working on its own accounts — but any accounts created only in `auth_schema`
after cutover won't exist there, per the "no backfill / no dual-write" data
policy in `docs/architecture/table-ownership-matrix.md`).

`GET /auth/me` intentionally returns a minimal identity payload (no
name/phone/city/bio) until Phase 3 ships `GET /users/me` on users-service —
see Task 2.4/3.2 in `docs/architecture/microservices-extraction-checklist.md`.
The frontend must be updated to read profile fields from `/users/me` instead
of `/auth/me` once Phase 3 lands.
