# docker/dev

Local development only. Dockerfiles for each deployable service live inside that
service's own folder (`backend/Dockerfile`, `frontend/Dockerfile`,
`services/*/Dockerfile`) so each stays independently buildable/deployable outside
of Compose too - the files here are purely for local orchestration:

- `compose.infra.yml` - Postgres, Redis (core, no profile needed), RabbitMQ (`events`
  profile), `postgres-ai` (`python-workers` profile). No app code, nothing built.
- `compose.services.yml` - app/worker services, containerized, each behind a
  profile (`events`, `node-workers`, `python-workers`, `auth`). Optional - the
  recommended day-to-day loop is running these with `yarn dev` /
  `python src/main.py` instead (see below); use this file to leave a service
  running in Docker in the background. `auth-service`/`users-service`/
  `outbox-publisher-auth` (Phase 2) have their own `auth` profile so you can
  turn just those three on/off independently of the other worker services.
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

Or from the repo root: `yarn dev:infra` (includes RabbitMQ `--profile events`).

Starts Postgres, Redis, RabbitMQ, and the gateway (Traefik, routing to
`host.docker.internal`). Then, on the host, in another terminal:

```bash
yarn dev:list        # all bundles and per-service scripts
yarn dev             # frontend + companies-service (default)
yarn dev:auth:app    # frontend + auth + users + outbox-auth
```

Point the frontend at the gateway: `VITE_API_URL=http://localhost:8080` (bundle
scripts set this automatically). See [`scripts/dev/README.md`](../../scripts/dev/README.md)
for every `yarn dev:svc:*` / `yarn dev:outbox:*` command and port map.

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
cd services/ai-service && python src/main.py
```

Since Phase 2, also start these if you're testing `/auth/*` end-to-end
(register/login need the identity write to actually reach RabbitMQ, and
users-service to create the profile) - either the same way, on the host:

```bash
cd services/auth-service && yarn dev
cd services/users-service && yarn dev

# Second outbox-publisher instance, pointed at auth_schema (Q8).
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dauth_schema" HEALTH_PORT=4501 yarn dev
```

Since Phase 4, also start companies-service if you're testing `/companies/*`:

```bash
cd services/companies-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dcompanies_schema" HEALTH_PORT=4503 yarn dev
```

Since Phase 5, also start company-members-service if you're testing
`/companies/:id/members/*` (auth-service's membership projection needs it too):

```bash
cd services/company-members-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dcompany_members_schema" HEALTH_PORT=4504 yarn dev
```

Since Phase 6, also start specialists-service if you're testing `/specialists/*`:

```bash
cd services/specialists-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dspecialists_schema" HEALTH_PORT=4505 yarn dev
```

Since Phase 7, also start company-specialists-service if you're testing
`/companies/:id/specialists*` or `/specialists/me/company*`:

```bash
cd services/company-specialists-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dcompany_specialists_schema" HEALTH_PORT=4506 yarn dev
```

Since Phase 8, also start services-catalog-service if you're testing
`/companies/:id/services*`, `/services/*`, or `/specialists/me/services`:

```bash
cd services/services-catalog-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dservices_schema" HEALTH_PORT=4507 yarn dev
```

Since Phase 9, also start appointments-service if you're testing
`/companies/:id/appointments*`, `/appointments/me`,
`/appointments/:id/status-history`, or `/appointments/:id/cancel`:

```bash
cd services/appointments-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dappointments_schema" HEALTH_PORT=4508 yarn dev
```

Since Phase 10, also start reviews-service if you're testing
`/appointments/:id/review`, `/companies/:id/reviews`, `/services/:id/reviews`,
or `/specialists/:id/reviews`:

```bash
cd services/reviews-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dreviews_schema" HEALTH_PORT=4509 yarn dev
```

or, containerized instead of `yarn dev`, using the dedicated `auth`/`companies`/
`company-members`/`specialists`/`company-specialists`/`services-catalog`/`appointments`/`reviews`
profiles in `compose.services.yml` (each turns its own group on/off together,
independent of the other worker services):

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml \
  -f docker/dev/compose.services.yml --profile events --profile auth --profile companies --profile company-members --profile specialists --profile company-specialists --profile services-catalog --profile appointments --profile reviews up
```

(`--profile events` is required too, since `outbox-publisher-auth`,
`outbox-publisher-companies`, `outbox-publisher-company-members`,
`outbox-publisher-specialists`, `outbox-publisher-company-specialists`,
`outbox-publisher-services-catalog`, `outbox-publisher-appointments`,
`outbox-publisher-reviews`, `users-service`, `company-members-service`, and
`appointments-service` all need RabbitMQ, which lives behind infra's `events`
profile.) Stop just these with:

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml \
  -f docker/dev/compose.services.yml --profile events --profile auth --profile companies --profile company-members --profile specialists --profile company-specialists --profile services-catalog --profile appointments --profile reviews stop \
  auth-service users-service outbox-publisher-auth companies-service outbox-publisher-companies \
  company-members-service outbox-publisher-company-members specialists-service outbox-publisher-specialists \
  company-specialists-service outbox-publisher-company-specialists services-catalog-service outbox-publisher-services-catalog \
  appointments-service outbox-publisher-appointments reviews-service outbox-publisher-reviews
```

First time only - each app/service reads its config from its own `.env`, never
from Compose:

```bash
cp backend/.env.example backend/.env
cp services/outbox-publisher/.env.example services/outbox-publisher/.env
cp services/notifications-service/.env.example services/notifications-service/.env
cp services/metrics-service/.env.example services/metrics-service/.env
cp services/ai-service/.env.example services/ai-service/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/users-service/.env.example services/users-service/.env
cp services/companies-service/.env.example services/companies-service/.env
cp services/company-members-service/.env.example services/company-members-service/.env
cp services/specialists-service/.env.example services/specialists-service/.env
cp services/company-specialists-service/.env.example services/company-specialists-service/.env
cp services/services-catalog-service/.env.example services/services-catalog-service/.env
cp services/appointments-service/.env.example services/appointments-service/.env
cp services/reviews-service/.env.example services/reviews-service/.env
```

`services/auth-service/.env`'s `JWT_ACCESS_SECRET` must match
`backend/.env`'s exactly (both default to `dev-access-secret-change-me`, so
this "just works" with the example files as-is) - see Phase 2 Task 2.6 in
`docs/architecture/microservices-extraction-checklist.md`. Since Phase 11,
`services/notifications-service/.env`'s `JWT_ACCESS_SECRET` needs the same
value too (it now verifies tokens for its new HTTP API), and `backend/.env`'s
`IN_PROCESS_NOTIFICATIONS_ENABLED` should be `false` (default in
`backend/.env.example` as of this phase) so notifications-service's consumer
is the only thing creating notifications/emails.

Since Phase 12, `backend-projection-service` no longer exists —
`appointments-service` and `companies-service` each grew their own RabbitMQ
consumer for the one `ai.*` event they used to receive through it
(`ai.appointment_recommendation_created` and `ai.company_insight_created`
respectively), so make sure both services' `.env` files have `RABBITMQ_URL`
set (already the default in their `.env.example`s). Port `4400` is free.

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

Add `--profile python-workers` for `ai-service`, `--profile auth` for
`auth-service`/`users-service`/`outbox-publisher-auth` (Phase 2/3),
`--profile companies` for `companies-service`/`outbox-publisher-companies`
(Phase 4), `--profile company-members` for
`company-members-service`/`outbox-publisher-company-members` (Phase 5),
`--profile specialists` for `specialists-service`/`outbox-publisher-specialists`
(Phase 6), `--profile company-specialists` for
`company-specialists-service`/`outbox-publisher-company-specialists` (Phase 7),
`--profile services-catalog` for
`services-catalog-service`/`outbox-publisher-services-catalog` (Phase 8),
`--profile appointments` for `appointments-service`/`outbox-publisher-appointments`
(Phase 9), or `--profile reviews` for `reviews-service`/`outbox-publisher-reviews`
(Phase 10) - each kept in its own profile, separate from `node-workers`, so it
can be turned on/off on its own. You can also target individual services instead of a whole profile,
e.g. add `metrics-service` or `auth-service` to the end of the command above -
Compose still needs `--profile <name>` passed for that service's profile to
be recognized, even when you name it explicitly.

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
for the Phase 1 checklist,
[`docs/architecture/smoke-checklists/phase-2-auth-service.md`](../../docs/architecture/smoke-checklists/phase-2-auth-service.md)
for Phase 2 (`/auth/*` now served by auth-service; `auth.user_registered` ->
users-service),
[`docs/architecture/smoke-checklists/phase-3-users-service.md`](../../docs/architecture/smoke-checklists/phase-3-users-service.md)
for Phase 3 (`/users/me`, `/users/:id`), and
[`docs/architecture/smoke-checklists/phase-4-companies-service.md`](../../docs/architecture/smoke-checklists/phase-4-companies-service.md)
for Phase 4 (`/companies/*` profile routes), and
[`docs/architecture/smoke-checklists/phase-5-company-members-service.md`](../../docs/architecture/smoke-checklists/phase-5-company-members-service.md)
for Phase 5 (`/companies/:id/members/*`, auth membership projection), and
[`docs/architecture/smoke-checklists/phase-6-specialists-service.md`](../../docs/architecture/smoke-checklists/phase-6-specialists-service.md)
for Phase 6 (`/specialists/*` profile routes), and
[`docs/architecture/smoke-checklists/phase-7-company-specialists-service.md`](../../docs/architecture/smoke-checklists/phase-7-company-specialists-service.md)
for Phase 7 (`/companies/:id/specialists*`, `/specialists/me/company*`), and
[`docs/architecture/smoke-checklists/phase-8-services-catalog-service.md`](../../docs/architecture/smoke-checklists/phase-8-services-catalog-service.md)
for Phase 8 (`/companies/:id/services*`, `/services/*`, `/specialists/me/services`), and
[`docs/architecture/smoke-checklists/phase-9-appointments-service.md`](../../docs/architecture/smoke-checklists/phase-9-appointments-service.md)
for Phase 9 (`/companies/:id/appointments*`, `/appointments/me`, `/appointments/:id/status-history`, `/appointments/:id/cancel`), and
[`docs/architecture/smoke-checklists/phase-10-reviews-service.md`](../../docs/architecture/smoke-checklists/phase-10-reviews-service.md)
for Phase 10 (`/appointments/:id/review`, `/companies/:id/reviews`, `/services/:id/reviews`, `/specialists/:id/reviews`), and
[`docs/architecture/smoke-checklists/phase-11-notifications-service.md`](../../docs/architecture/smoke-checklists/phase-11-notifications-service.md)
for Phase 11 (`/notifications/me*`), and
[`docs/architecture/smoke-checklists/phase-12-backend-projection-retirement.md`](../../docs/architecture/smoke-checklists/phase-12-backend-projection-retirement.md)
for Phase 12 (backend-projection-service retirement).

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
| `notifications-service` | 4300 | `/health/live`, `/health/ready`, `/notifications/me*` |
| `metrics-service` | 4100 | `/metrics`, `/health/live`, `/health/ready` |
| `ai-service` | 4200 | `/health/live`, `/health/ready` |
| `auth-service` | 4001 | `/health/live`, `/health/ready` |
| `users-service` | 4002 | `/health/live`, `/health/ready` |
| `outbox-publisher-auth` | 4501 | `/health/live`, `/health/ready` |
| `companies-service` | 4003 | `/health/live`, `/health/ready` |
| `company-members-service` | 4004 | `/health/live`, `/health/ready` |
| `specialists-service` | 4005 | `/health/live`, `/health/ready` |
| `company-specialists-service` | 4006 | `/health/live`, `/health/ready` |
| `services-catalog-service` | 4007 | `/health/live`, `/health/ready` |
| `appointments-service` | 4008 | `/health/live`, `/health/ready` |
| `outbox-publisher-appointments` | 4508 | `/health/live`, `/health/ready` |
| `reviews-service` | 4009 | `/health/live`, `/health/ready` |
| `outbox-publisher-reviews` | 4509 | `/health/live`, `/health/ready` |
| `gateway` (Traefik) | 8080 (app traffic), 8081 (dashboard, local dev only) | none of its own - proxies `/health`, `/health/live`, `/health/ready` through to whichever backend currently owns that path |
