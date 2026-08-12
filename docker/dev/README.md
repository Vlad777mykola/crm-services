# docker/dev

Local development only. Dockerfiles for each deployable service live inside that
service's own folder (`backend/Dockerfile`, `frontend/Dockerfile`,
`services/*/Dockerfile`) so each stays independently buildable/deployable outside
of Compose too - the files here are purely for local orchestration:

- `compose.infra.yml` - Postgres, Redis (core, no profile needed), RabbitMQ (`events`
  profile), `postgres-ai` (`python-workers` profile). No app code, nothing built.
- `compose.services.yml` - app/worker services, containerized, each behind the same
  profile as its infra dependency (`events`, `node-workers`, `python-workers`).
  Optional - the recommended day-to-day loop is running these with `yarn dev` /
  `python src/main.py` instead (see below); use this file to leave a service
  running in Docker in the background.
- `compose.gateway.yml` - Traefik gateway only, routing to `host.docker.internal`
  (`traefik/dynamic.host.yml`) - use when legacy-backend/services run on the host.
- `compose.legacy.yml` - Traefik gateway + legacy-backend, both containerized
  (`traefik/dynamic.container.yml`) - closer to the production shape
  (`docker/prod/`), useful for container-parity testing.

See [`docs/architecture/target-production-architecture.md`](../../docs/architecture/target-production-architecture.md)
for the full service map this mirrors, and
[`docs/architecture/gateway-routing.md`](../../docs/architecture/gateway-routing.md)
for how the gateway's routing rules work.

## Recommended day-to-day loop

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml up
```

Starts Postgres, Redis, and the gateway (Traefik, routing to
`host.docker.internal`). Then, on the host, in another terminal:

```bash
yarn dev            # frontend + legacy-backend
```

Point the frontend at the gateway: `VITE_API_URL=http://localhost:8080`. No image
rebuild needed for backend code changes - `tsx watch` handles reload.

Add RabbitMQ/`postgres-ai` if you need events/AI running too:

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml \
  --profile events --profile python-workers up
```

then, on the host, whichever of these you need:

```bash
cd services/outbox-publisher && yarn dev
cd services/notifications-service && yarn dev
cd services/metrics-service && yarn dev
cd services/backend-projection-service && yarn dev
cd services/ai-service && python src/main.py
```

Since Phase 2, also start these if you're testing `/auth/*` end-to-end
(register/login need the identity write to actually reach RabbitMQ, and
users-service to create the profile):

```bash
cd services/auth-service && yarn dev
cd services/users-service && yarn dev

# Second outbox-publisher instance, pointed at auth_schema (Q8) - copy
# services/outbox-publisher/.env into a second file first, see below.
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dauth_schema" HEALTH_PORT=4501 yarn dev
```

First time only - each app/service reads its config from its own `.env`, never
from Compose:

```bash
cp backend/.env.example backend/.env
cp services/outbox-publisher/.env.example services/outbox-publisher/.env
cp services/notifications-service/.env.example services/notifications-service/.env
cp services/metrics-service/.env.example services/metrics-service/.env
cp services/backend-projection-service/.env.example services/backend-projection-service/.env
cp services/ai-service/.env.example services/ai-service/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/users-service/.env.example services/users-service/.env
```

`services/auth-service/.env`'s `JWT_ACCESS_SECRET` must match
`backend/.env`'s exactly (both default to `dev-access-secret-change-me`, so
this "just works" with the example files as-is) - see Phase 2 Task 2.6 in
`docs/architecture/microservices-extraction-checklist.md`.

All Postgres/RabbitMQ credentials in each `.env.example` already match what
`compose.infra.yml` provisions, so no further edits are needed for local dev.

## Container-parity mode (test through real containers)

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.legacy.yml up --build
```

Everything containerized - `gateway` + `legacy-backend`, rebuild (`--build`)
whenever backend code changes. Same routing rules as the fast loop above, just a
different backend host (Compose service DNS vs. `host.docker.internal`) - see
`traefik/dynamic.container.yml` vs. `traefik/dynamic.host.yml`.

## Running selected services in Docker instead of `yarn dev`

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml \
  -f docker/dev/compose.services.yml --profile events --profile node-workers up
```

Add `--profile python-workers` for `ai-service` too. You can also target
individual services instead of a whole profile, e.g. add `metrics-service` to the
end of the command above.

## Frontend config

```txt
VITE_API_URL=http://localhost:8080
```

## Smoke check

```bash
curl -i http://localhost:8080/health
curl -i http://localhost:8080/health/ready
curl -i http://localhost:8080/companies/public
curl -i http://localhost:8080/auth/me
```

See [`docs/architecture/smoke-checklists/phase-1-traefik-gateway.md`](../../docs/architecture/smoke-checklists/phase-1-traefik-gateway.md)
for the Phase 1 checklist and
[`docs/architecture/smoke-checklists/phase-2-auth-service.md`](../../docs/architecture/smoke-checklists/phase-2-auth-service.md)
for Phase 2 (`/auth/*` now served by auth-service; `auth.user_registered` ->
users-service).

## Stop / clean up

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml \
  -f docker/dev/compose.services.yml -f docker/dev/compose.legacy.yml down --remove-orphans
```

## Volumes

- `postgres-data`, `redis-data` (infra) - the usual per-service state.
- `rabbitmq-data` (infra, `events` profile) - RabbitMQ state.
- `postgres-ai-data` (infra, `python-workers` profile) - dedicated AI database
  state, never shared with `postgres-data`.

## Redis: reserved infrastructure

Redis runs in the core infra stack, but no application code uses it yet. It's
kept available (rather than removed) for rate limiting, caching, session
blacklists, or distributed locks when one of those becomes necessary - don't
treat it as a source of truth in the meantime.

## Health checks

Every deploy unit exposes `GET /health/live` (process alive) and `GET /health/ready`
(dependencies reachable - DB, RabbitMQ, etc.) so an orchestrator can distinguish
"restart me" from "don't route traffic to me yet":

| Service | Port | Endpoints |
|---|---|---|
| `backend` | 4000 | `/health`, `/health/live`, `/health/ready` |
| `outbox-publisher` | 4500 | `/health/live`, `/health/ready` |
| `notifications-service` | 4300 | `/health/live`, `/health/ready` |
| `metrics-service` | 4100 | `/metrics`, `/health/live`, `/health/ready` |
| `backend-projection-service` | 4400 | `/health/live`, `/health/ready` |
| `ai-service` | 4200 | `/health/live`, `/health/ready` |
| `auth-service` | 4001 | `/health/live`, `/health/ready` |
| `users-service` | 4002 | `/health/live`, `/health/ready` |
| `outbox-publisher-auth` | 4501 | `/health/live`, `/health/ready` |
| `gateway` (Traefik) | 8080 (app traffic), 8081 (dashboard, local dev only) | none of its own - proxies `/health`, `/health/live`, `/health/ready` through to whichever backend currently owns that path |
