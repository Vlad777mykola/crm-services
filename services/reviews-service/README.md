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
- `processed_events`, `outbox_events` (reserved for consistency; no consumer
  exists in this phase).

## Consumed events

None.

## Published events

Reuses the existing `review.received.v1.json` contract as-is (Task 10.4 — no
v2, payload unchanged from legacy).

## Known gaps / temporary compromises

- **`legacy-appointments-bridge.ts`** (temporary, explicitly flagged
  cross-schema read of `appointments_schema.appointments`/
  `appointment_service_projection`): validates the requester owns a
  **completed** appointment, and denormalizes `companyId`/`serviceId`/
  `specialistProfileId`/`serviceName` onto the review row.
  `appointment.completed.v1.json` (and every other `appointment.*` event -
  Task 9.5 reused those as-is) does not carry `specialistProfileId`, so a
  purely event-fed projection can't support `GET /specialists/:specialistId/reviews`
  (one of this phase's 4 confirmed routes) without that field. Revisit if/when
  an `appointment.*` contract gains `specialistProfileId`.

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
