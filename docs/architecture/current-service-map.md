# Current Service Map

Snapshot of the repository's deployable units before the microservices refactor (see the sibling documents in this folder for the target state).

## Deploy units today

| Service | Language | Location | Dockerfile | Command | Ports | Database | RabbitMQ |
|---|---|---|---|---|---|---|---|
| frontend | React + Vite | `frontend/` | `frontend/Dockerfile` | nginx serves `dist/` | 8080 (local only) | none | no |
| backend API | Node.js + Express | `backend/` | `backend/Dockerfile` | `node dist/main.js` | 4000 | main-postgres | optional publish (unset by default) |
| notifications-worker | Node.js | `backend/src/workers/` | `backend/Dockerfile.worker` | `node dist/workers/notifications.worker.js` | — | main-postgres | consumer |
| metrics-worker | Node.js | `backend/src/workers/` | `backend/Dockerfile.worker` | `node dist/workers/metrics.worker.js` | 4100 | none | observer |
| analytics-worker | Node.js | `backend/src/workers/` | `backend/Dockerfile.worker` | `node dist/workers/analytics.worker.js` | — | shared SQLite | consumer |
| python-analytics-worker | Python | `python-worker/` | `python-worker/Dockerfile` | `python worker.py` | — | shared SQLite | consumer + publisher |
| python-metrics-worker | Python | `python-worker/` | `python-worker/Dockerfile` | `python metrics_worker.py` | 4200 | none | observer |

## Known gaps (drove this refactor)

- Node workers import backend business modules directly (`@/modules/*`, `AppDataSource`) — not independently deployable in code, only in process.
- No outbox pattern: business writes and RabbitMQ publish are not atomic.
- RabbitMQ starts by default in Compose, but the backend does not publish to it — confusing "looks event-driven but isn't" state.
- Python analytics uses a SQLite file shared with the Node analytics worker — not a real service-owned datastore.
- No CI/CD workflows.
- Backend exposes a single `/health` endpoint; several workers have no health check at all.
- Redis is wired into Compose but unused by any application code.
- No idempotency tracking (`processed_events`) in any consumer.
- No dead-letter queues.

See [`target-production-architecture.md`](target-production-architecture.md) for the structure this repository is being migrated to, and [`service-ownership.md`](service-ownership.md) / [`event-driven-model.md`](event-driven-model.md) for the data and event contracts that make the migration safe.
