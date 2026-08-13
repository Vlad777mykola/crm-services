# Phase 0 — Startup & connectivity audit

Reference for `yarn verify:startup`. Status reflects implementation as of orchestration work completion.

| Component | Env | DB | RMQ | Schema | Ready | Shutdown |
|-----------|-----|-----|-----|--------|-------|----------|
| auth | verify | verify | verify (consumer) | verify | DB+RMQ | verify |
| users | verify | verify | verify | verify | DB+RMQ | verify |
| companies | verify | verify | verify | verify | DB+RMQ | verify |
| company-members | verify | verify | verify | verify | DB+RMQ | verify |
| specialists | verify | verify | verify | verify | DB+RMQ | verify |
| company-specialists | verify | verify | verify | verify | DB+RMQ | verify |
| services-catalog | verify | verify | verify | verify | DB+RMQ | verify |
| appointments | verify | verify | verify | verify | DB+RMQ | verify |
| reviews | verify | verify | verify | verify | DB+RMQ | verify |
| notifications | normalize env | verify | verify | verify | DB+RMQ | verify |
| dashboard | verify | cross-schema read | N/A | prerequisites | schema tables | verify |
| outbox ×9 | verify | verify | verify | outbox table | DB+RMQ | verify |
| metrics-service | verify | N/A | verify | N/A | RMQ | verify |
| ai-service | minimal validate | postgres-ai | verify | migrations | DB+RMQ | verify |
| frontend | verify | N/A | N/A | N/A | serves :15173 | verify |
| gateway | N/A | N/A | N/A | N/A | liveness+routes+CORS | N/A |
| redis | N/A | N/A | N/A | N/A | ping | N/A |

## Verify port namespace

| Resource | Dev | Verify |
|----------|-----|--------|
| Postgres | 5432 | **25432** |
| Postgres AI | 5433 | **25433** |
| RabbitMQ AMQP | 5672 | **25672** |
| RabbitMQ mgmt | 15672 | **25673** |
| Gateway | 8080 | **28080** |
| Frontend | 5173 | **15173** |
| App ports | 4001… | dev + **10000** |

Project: `crm-verify`. Disposable volumes (`down -v`).

## Required vs optional dependencies (summary)

| Component | Postgres startup-critical? | RabbitMQ startup-critical? | Notes |
|-----------|---------------------------|----------------------------|-------|
| Domain HTTP services | yes | yes if consumer | Readiness reflects deliberate semantics per service |
| dashboard | yes (cross-schema) | no | Verifies prerequisite schemas exist |
| outbox ×9 | yes | yes | Poll + publish path |
| metrics-service | no | yes | No `DATABASE_URL` |
| ai-service | yes (postgres-ai) | yes | Migrations on startup + verify pre-bootstrap |
| frontend | no | no | Vite dev server only |
| gateway | no | no | Liveness + routes + CORS |

Example: `companies` `/companies/public` needs Postgres only at runtime, but readiness includes RabbitMQ because the consumer is startup-critical for normal operation.

## Gate command

```powershell
yarn verify:startup
```

Does **not** touch dev Postgres (`:5432`) or dev app ports.
