# reviews-service

Owns reviews as a standalone service (confirmed per Task 10.1). Extracted per
`docs/architecture/microservices-extraction-checklist.md` Phase 10.

## Owned routes

**Exactly these 4** — spread across `/appointments/*`, `/companies/*`,
`/services/*`, `/specialists/*` (not a `/reviews/*` prefix — no real path
starts with `/reviews`):

- `POST /appointments/:appointmentId/review` - client reviews their own completed appointment.
- `GET /companies/:companyId/reviews` - public.
- `GET /services/:serviceId/reviews` - public.
- `GET /specialists/:specialistId/reviews` - public.

## Owned tables / schema (`reviews_schema`)

- `reviews` (new, empty — no data migration).
- `appointment_review_eligibility_projection` (fed by appointments-service).
- `processed_events`, `outbox_events`.

## Consumed events

| Event | Purpose |
|---|---|
| `appointment.review_eligible` | Upserts completed appointment context used to validate and denormalize new reviews. |

## Published events

Reuses the existing `review.received.v1.json` contract as-is (Task 10.4 — no
v2, payload unchanged from legacy).

## Required environment variables

See `.env.example`. `JWT_ACCESS_SECRET` must match auth-service's exactly —
this service only verifies tokens, never issues them.

## Running locally

```bash
cd services/reviews-service
yarn install
yarn dev
```

Or as a container — see `docker/dev/README.md` (`reviews` profile).

## Current migration status

Gateway routes all 4 paths above to this service. `services/gateway` no
longer forwards them to `legacy-backend`.
