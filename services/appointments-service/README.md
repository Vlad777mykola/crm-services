# appointments-service

Owns the appointment lifecycle end-to-end. Extracted per
`docs/architecture/microservices-extraction-checklist.md` Phase 9 - "the most
sensitive domain", started only after companies, company-members,
specialists, company-specialists, and services-catalog were stable.

## Owned routes

- `POST /companies/:companyId/appointments` - client requests an appointment.
- `GET /companies/:companyId/appointments` - company (owner/manager) lists its appointments; accepts `from`, `to`, `status`, `serviceId`, `specialistProfileId`, `limit`.
- `GET /companies/:companyId/appointments/requests` - company lists pending appointment requests.
- `PATCH /companies/:companyId/appointments/:appointmentId` - company approves/rejects (body: `{ "status": "approved" | "rejected" }`).
- `POST /companies/:companyId/appointments/:appointmentId/complete` - company marks an approved appointment completed.
- `POST /companies/:companyId/appointments/:appointmentId/reschedule` - company reschedules a pending/approved appointment.
- `GET /companies/:companyId/availability`, `PUT /companies/:companyId/availability` - company availability rules.
- `POST /companies/:companyId/time-blocks`, `DELETE /companies/:companyId/time-blocks/:blockId` - company blocks.
- `GET /companies/:companyId/specialists/:specialistProfileId/availability`, `PUT .../availability` - specialist availability in a company.
- `POST /companies/:companyId/specialists/:specialistProfileId/time-blocks`, `DELETE .../time-blocks/:blockId` - specialist blocks.
- `GET /appointments/available-slots` - slot search for a company/service/specialist/time range.
- `GET /appointments/me` - client lists their own appointments; accepts the same range/filter query params.
- `GET /appointments/company/:companyId`, `GET /appointments/company/:companyId/requests` - query aliases for company views.
- `GET /appointments/specialist/:specialistProfileId` - company-authorized specialist appointment view; requires `companyId` query param.
- `GET /appointments/:appointmentId` - client (own) or company owner/manager appointment details.
- `GET /appointments/:appointmentId/status-history` - client (own) or company owner/manager.
- `POST /appointments/:appointmentId/cancel` - client cancels their own pending/approved appointment.

`POST .../approve`, `POST .../reject` (separate endpoints),
`GET /specialists/me/appointments`, and an `appointment.no_show` status remain
not implemented.

## Owned tables / schema (`appointments_schema`)

- `appointments`, `appointment_status_history` (brand-new table — no
  existing table to rename).
- `appointment_membership_projection` — fed by `company-member.added`/`.removed`.
- `appointment_company_projection` — fed by `company.created`/`.updated`.
- `appointment_service_projection` — fed by `service.created`/`.updated`.
- `appointment_service_specialist_projection` — fed by `specialist-service.assigned`/`.removed`.
- `company_availability_rules`, `company_time_blocks`,
  `specialist_availability_rules`, `specialist_time_blocks`.
- `appointment_recommendation_projections` — moved here from
  `backend-projection-service` in Phase 12; fed by
  `ai.appointment_recommendation_created`. AI-derived, not source-of-truth;
  safe to drop and rebuild.
- `processed_events`, `outbox_events`.

No data migration — every table starts empty; the local projections backfill
themselves as producers republish/re-emit their events (or immediately for
anything created after this service goes live).

## Consumed events

`company.created`, `company.updated`, `company-member.added`,
`company-member.removed`, `service.created`, `service.updated`,
`specialist-service.assigned`, `specialist-service.removed`,
`user.profile_created`, `user.profile_updated` — all purely to keep local
projections warm. **No cross-schema SQL** for any of these (Task 9.3). Also
consumes `ai.appointment_recommendation_created` (from
`analytics.events`, published by `ai-service`) to feed
`appointment_recommendation_projections` — moved from
`backend-projection-service` in Phase 12 (see
`docs/architecture/table-ownership-matrix.md`). No HTTP route exposes this
projection yet; it existed in the old service purely as a write target with
no confirmed reader.

## Published events

Reuses the existing v1 contracts as-is (Task 9.5 — no v2, payload unchanged
from legacy): `appointment.requested`, `appointment.approved`,
`appointment.rejected`, `appointment.rescheduled`, `appointment.completed`,
`appointment.cancelled`.

## Known gaps / temporary compromises

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
