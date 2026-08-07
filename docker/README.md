# docker

Local development infrastructure. Dockerfiles for each deployable service live inside
that service's own folder (`backend/Dockerfile`, `frontend/Dockerfile`,
`services/*/Dockerfile`) so each stays independently buildable/deployable outside of
Compose too - the files here are purely for local orchestration, split by concern:

- `docker-compose.yml` - core stack: Postgres, Redis, backend API. No profile needed.
- `docker-compose.events.yml` - RabbitMQ + `outbox-publisher`, behind the `events` profile.
- `docker-compose.workers.yml` - Node.js consumer services, behind the `node-workers` profile.
- `docker-compose.ai.yml` - Python AI service + its own Postgres, behind the `python-workers` profile.

See [`docs/architecture/target-production-architecture.md`](../docs/architecture/target-production-architecture.md)
for the full service map this mirrors.

## The four ways to run this

Run everything from the repository root.

### 1. Core only (the real minimal deploy shape)

```bash
docker compose -f docker/docker-compose.yml up
```

Postgres, Redis, and the API - nothing else. This mirrors the minimum production
footprint. RabbitMQ does **not** start here; the backend never depends on it being
reachable.

### 2. + Event infrastructure

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.events.yml --profile events up
```

Adds RabbitMQ and `outbox-publisher`. The backend writes to its own `outbox_events`
table inside the same DB transaction as its business writes; `outbox-publisher` is the
only process that reads that table and publishes to RabbitMQ.

### 3. + Node.js worker services

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.events.yml -f docker/docker-compose.workers.yml \
  --profile events --profile node-workers up
```

Adds `notifications-service`, `metrics-service`, and `backend-projection-service` - each
its own top-level folder under `services/`, each independently buildable/deployable, none
importing backend source.

### 4. + Python AI service

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.events.yml -f docker/docker-compose.ai.yml \
  --profile events --profile python-workers up
```

Adds `postgres-ai` (a dedicated Postgres instance, never shared with the main database)
and `ai-service`. Combine profiles to run everything at once:

```bash
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.events.yml \
  -f docker/docker-compose.workers.yml \
  -f docker/docker-compose.ai.yml \
  --profile events --profile node-workers --profile python-workers up
```

You can also target individual services instead of a whole profile, e.g. add
`metrics-service` to the end of the command above.

## Fully local, no Docker for the app itself

Only infra runs in containers; the backend, frontend, and any services run directly on
the host with `yarn`/`python` for fast reload loops.

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.events.yml --profile events up postgres redis rabbitmq
yarn dev                                                     # frontend + backend, on the host
cd services/outbox-publisher && yarn dev
cd services/notifications-service && yarn dev
cd services/metrics-service && yarn dev
cd services/backend-projection-service && yarn dev
cd services/ai-service && python src/main.py
```

## Volumes

- `postgres-data`, `redis-data` (core) - the usual per-service state.
- `rabbitmq-data` (events) - RabbitMQ state.
- `postgres-ai-data` (ai) - dedicated AI database state, never shared with `postgres-data`.

## Redis: reserved infrastructure

Redis runs in the core stack, but no application code uses it yet. It's kept available
(rather than removed) for rate limiting, caching, session blacklists, or distributed locks
when one of those becomes necessary - don't treat it as a source of truth in the meantime.

## Health checks

Every deploy unit exposes `GET /health/live` (process alive) and `GET /health/ready`
(dependencies reachable - DB, RabbitMQ, etc.) so an orchestrator can distinguish "restart
me" from "don't route traffic to me yet":

| Service | Port | Endpoints |
|---|---|---|
| `backend` | 4000 | `/health`, `/health/live`, `/health/ready` |
| `outbox-publisher` | 4500 | `/health/live`, `/health/ready` |
| `notifications-service` | 4300 | `/health/live`, `/health/ready` |
| `metrics-service` | 4100 | `/metrics`, `/health/live`, `/health/ready` |
| `backend-projection-service` | 4400 | `/health/live`, `/health/ready` |
| `ai-service` | 4200 | `/health/live`, `/health/ready` |
