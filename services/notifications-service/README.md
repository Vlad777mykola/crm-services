# notifications-service

Consumes `domain.events` + `analytics.events`, sends simulated emails, and
creates in-app notifications; also serves the `/notifications/me*` HTTP API
(added in Phase 11 — this service predates the extraction plan as a
RabbitMQ-only worker).

## Owned routes

- `GET /notifications/me` - list the caller's notifications.
- `GET /notifications/me/unread-count` - unread count.
- `POST /notifications/me/read-all` - mark every unread notification read.
- `POST /notifications/me/:notificationId/read` - mark one notification read.

Exact paths matter here — earlier plan drafts had
`POST /notifications/:notificationId/read` and `POST /notifications/read-all`
(missing `/me/` in both); the real paths always include `/me/` (Task 11.1).

## Owned tables / schema (`notifications_schema`)

- `notifications`, `email_logs` (Task 11.2 — moved out of the shared/public
  schema into their own schema; no data migration, both start empty).
- `processed_events` (idempotency ledger for this consumer).

## Consumed events

`appointment.*`, `review.received` (`domain.events`), plus
`analytics.company_rating_updated` (`analytics.events`, published by
`ai-service`).

## Published events

None — this service only creates notifications/emails as a side effect of
consuming other services' events.

## Known gaps / temporary compromises

- **`recipient-repository.ts`** reads `public.users`/`public.company_members`
  directly (predates this migration; not one of Phase 11's tasks). Revisit
  once users-service/company-members-service own those reads via events or a
  read API.
- Now that this service's HTTP + consumer fully replace legacy's in-process
  subscriber, `backend/.env`'s `IN_PROCESS_NOTIFICATIONS_ENABLED` must be
  `false` (Task 11.3) or notifications/emails get created twice.

## Required environment variables

See `.env.example`. `JWT_ACCESS_SECRET` must match auth-service's exactly —
this service only verifies tokens, never issues them.

## Running locally

```bash
cd services/notifications-service
yarn install
yarn dev
```

Or as a container — see `docker/dev/README.md` (`node-workers` profile).

## Current migration status

Gateway routes `/notifications/*` to this service (Task 11.4, after the HTTP
layer shipped in Task 11.1).
