# ai-service

Python AI/analytics microservice - evolved from `python-worker/`. Owns its own Postgres
database (`postgres-ai`, via `AI_DATABASE_URL`) instead of the SQLite file the old worker
shared with a Node.js sibling, and now publishes real AI result events for
[`services/backend-projection-service`](../backend-projection-service) and
[`services/notifications-service`](../notifications-service) to react to. See
[`docs/architecture/target-production-architecture.md`](../../docs/architecture/target-production-architecture.md).

```
backend API  --outbox-->  domain.events  --consume-->  ai-service
                                                            |
                                                (postgres-ai, own tables)
                                                            |
                                              analytics.events <--publish--
                                               /                        \
                                notifications-service          backend-projection-service
                              (rating-updated -> notification)   (recommendation -> projection row)
```

## What it does

- Binds a durable queue (with a dead-letter exchange, see
  [`docs/architecture/event-driven-model.md`](../../docs/architecture/event-driven-model.md)) to
  `domain.events` for `appointment.*` and `review.received`.
- Tracks a per-company, per-event-type counter (`ai_events`).
- For `review.received`: rolls the rating into `company_daily_stats` and publishes
  `analytics.company_rating_updated` with the recomputed running average.
- For `appointment.requested`: writes an `ai_jobs` + `ai_recommendations` row (a simple
  heuristic today, not a trained model) and publishes
  `ai.appointment_recommendation_created`.
- Idempotent: every event is checked against `processed_events` before being handled.
- Serves `GET /health/live` and `GET /health/ready` (Postgres + RabbitMQ connectivity) on
  `AI_SERVICE_HEALTH_PORT`.

AI-owned tables (see [`db/migrations/001_init.sql`](src/db/migrations/001_init.sql)):
`ai_events`, `processed_events`, `ai_jobs`, `ai_recommendations`, `ai_insights`,
`company_daily_stats`, `specialist_daily_stats` (reserved - not populated yet, see the
migration file).

## Running it locally

Requires RabbitMQ and `postgres-ai` running (e.g.
`docker compose -f docker/dev/compose.infra.yml --profile events --profile python-workers up rabbitmq postgres-ai`
from the repo root) and the backend + `outbox-publisher` running so there's something to
consume.

```bash
cd services/ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
python src/main.py
```

## Running it in Docker

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.services.yml \
  --profile events --profile python-workers up ai-service
```

See [`docker/dev/README.md`](../../docker/dev/README.md) for how this combines with the Node.js
services.
