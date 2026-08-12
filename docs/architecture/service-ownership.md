# Service Ownership Matrix

## Data ownership

| Data / table | Owner | Can other services read? | Can other services write? | Future owner if changed |
|---|---|---|---|---|
| `users`, `companies`, `company_members`, `appointments`, `services`, `reviews`, `auth_*`, etc. | backend | notifications-service (read-only, MVP recipient lookup) | no | unchanged |
| `outbox_events` | backend (insert) | outbox-publisher (read pending rows) | outbox-publisher (status/attempts/published_at only) | unchanged |
| `notifications`, `email_logs` | **notifications-service** (logical owner) | backend API (read-only, to expose UI endpoints) | backend API must not write once the service is extracted | dedicated notifications-service Postgres |
| `processed_events` (per consumer) | each consumer service owns its own table | no | no | unchanged |
| `ai_events`, `ai_jobs`, `ai_recommendations`, `ai_insights`, `company_daily_stats`, `specialist_daily_stats` | ai-service (postgres-ai) | none directly — only via published `ai.*` events | no | unchanged |
| `appointment_recommendation_projections` | appointments-service (`appointments_schema`) | backend API (read-only, no route yet) | no | resolved Phase 12 — moved from backend-projection-service |
| `company_insight_projections` | companies-service (`companies_schema`) | backend API (read-only, no route yet) | no | resolved Phase 12 — moved from backend-projection-service |

## Rules

1. `outbox-publisher` has **limited write access** to `outbox_events` only (status, attempts, `next_retry_at`, `published_at`). It has no access to `users`, `appointments`, `companies`, `auth_*`, `notifications`, or any other business table.
2. `notifications-service` is the **logical owner** of `notifications` and `email_logs` even while they physically live in the main Postgres instance during the MVP phase. The backend API may only read them for UI endpoints (e.g. "list my notifications") — it must not create or update rows there once the service is live.
3. `ai-service` owns all `ai_*` tables in `postgres-ai`. It never writes to main-postgres directly; it only publishes result events (`ai.appointment_recommendation_created`, `ai.company_insight_created`, `ai.job_failed`).
4. AI-derived projection tables live in the schema of whichever service they logically belong to (appointments-service, companies-service), and only in dedicated projection tables — never in business tables. `backend-projection-service`, which used to hold both of these before either service existed, was retired in Phase 12 once both consumers moved.
5. Every consumer service that has a database keeps its own `processed_events(event_id, consumer_name, processed_at)` table for idempotency. These tables are never shared across services.

## Side-effect ownership (avoiding duplicates)

Each side effect (e.g. "create a notification when an appointment is requested") must have exactly one owner at any point in time:

| Phase | Owner of notification creation |
|---|---|
| Before `notifications-service` is deployed | Backend in-process event subscriber (MVP) |
| After `notifications-service` is deployed | `notifications-service` only — backend in-process subscriber is disabled via `IN_PROCESS_NOTIFICATIONS_ENABLED=false` |

Running both at once produces duplicate notifications and duplicate emails — see [`event-driven-model.md`](event-driven-model.md) for the transition mechanics.
