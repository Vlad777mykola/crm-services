# appointments-service

Owns the appointment lifecycle end-to-end. Extracted per
`docs/architecture/microservices-extraction-checklist.md` Phase 9 - "the most
sensitive domain", started only after companies, company-members,
specialists, company-specialists, and services-catalog were stable.

## Owned routes

- `POST /companies/:companyId/appointments` - client requests an appointment.
- `GET /companies/:companyId/appointments` - company (owner/manager) lists its appointments.
- `PATCH /companies/:companyId/appointments/:appointmentId` - company approves/rejects (body: `{ "status": "approved" | "rejected" }`).
- `POST /companies/:companyId/appointments/:appointmentId/complete` - company marks an approved appointment completed.
- `GET /appointments/me` - client lists their own appointments.
- `GET /appointments/:appointmentId/status-history` - client (own) or company owner/manager.
- `POST /appointments/:appointmentId/cancel` - client cancels their own pending/approved appointment.

**Exactly these 7** — per Task 9.2, `POST .../approve`, `POST .../reject`
(separate endpoints), plain `GET /appointments/:appointmentId`,
`GET /specialists/me/appointments`, and an `appointment.no_show` status are
all explicitly **not implemented** (confirmed not to exist in legacy either).

## Owned tables / schema (`appointments_schema`)

- `appointments`, `appointment_status_history` (brand-new table — no
  existing table to rename).
- `appointment_membership_projection` — fed by `company-member.added`/`.removed`.
- `appointment_company_projection` — fed by `company.created`/`.updated`.
- `appointment_service_projection` — fed by `service.created`/`.updated`.
- `appointment_service_specialist_projection` — fed by `specialist-service.assigned`/`.removed`.
- `processed_events`, `outbox_events`.

No data migration — every table starts empty; the four projections backfill
themselves as producers republish/re-emit their events (or immediately for
anything created after this service goes live).

## Consumed events

`company.created`, `company.updated`, `company-member.added`,
`company-member.removed`, `service.created`, `service.updated`,
`specialist-service.assigned`, `specialist-service.removed` — all purely to
keep the four local projections warm. **No cross-schema SQL** for any of
these (Task 9.3).

## Published events

Reuses the existing v1 contracts as-is (Task 9.5 — no v2, payload unchanged
from legacy): `appointment.requested`, `appointment.approved`,
`appointment.rejected`, `appointment.completed`, `appointment.cancelled`.

## Known gaps / temporary compromises

- **`clientName` cross-schema read** (`src/db/legacy-users-bridge.ts`):
  `appointment.requested.v1.json`/`appointment.cancelled.v1.json` require a
  `clientName` string, but there is no `user.*` event carrying a display name
  today (`user.profile_created` is unconfirmed/unimplemented — see
  `docs/architecture/event-catalog.md`). Reads `users_schema.user_profiles`
  directly instead of via a projection. Remove once users-service publishes a
  profile-changed event and a real `appointment_client_projection` exists.
- **`hasReview` is always `false`**: legacy computed this per-appointment
  response field via a same-database join against `reviews`.
  `review.received.v1.json` does not carry `appointmentId`, so a projection
  can't be built without changing that contract (out of scope for this
  phase). Revisit in/after Phase 10 (reviews-service) if this field turns out
  to matter to the frontend.

## Required environment variables

See `.env.example`. `JWT_ACCESS_SECRET` must match auth-service's exactly —
this service only verifies tokens, never issues them.

## Running locally

```bash
cd services/appointments-service
yarn install
yarn dev
```

Or as a container — see `docker/dev/README.md` (`appointments` profile).

## Current migration status

Gateway routes all 7 paths above to this service. `services/gateway` no
longer forwards them to `legacy-backend`.
