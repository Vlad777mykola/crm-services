# Event Catalog

Extends `contracts/events/README.md` with implementation status per event. This is the
contract-first gate: **no consumer or producer code ships for an event until its JSON
Schema file exists in `contracts/events/`.**

Every message uses the `envelope.v1.json` wrapper (`id`, `type`, `source`, `version`,
`time`, `correlationId`, `data`). Schema files describe only the `data` field.

## Implemented today

| Event | Exchange | Routing key | Publisher | Consumers | Schema file |
|---|---|---|---|---|---|
| `appointment.requested` | `domain.events` | `appointment.requested` | backend (via outbox) | notifications-service, ai-service, backend-projection-service (indirectly via ai.*) | `appointment.requested.v1.json` |
| `appointment.approved` | `domain.events` | `appointment.approved` | backend (via outbox) | notifications-service, ai-service | `appointment.approved.v1.json` |
| `appointment.rejected` | `domain.events` | `appointment.rejected` | backend (via outbox) | notifications-service | `appointment.rejected.v1.json` |
| `appointment.cancelled` | `domain.events` | `appointment.cancelled` | backend (via outbox) | notifications-service | `appointment.cancelled.v1.json` |
| `appointment.completed` | `domain.events` | `appointment.completed` | backend (via outbox) | notifications-service, ai-service | `appointment.completed.v1.json` |
| `review.received` | `domain.events` | `review.received` | backend (via outbox) | notifications-service | `review.received.v1.json` |
| `analytics.company_rating_updated` | `analytics.events` | `analytics.company_rating_updated` | ai-service | backend-projection-service | `analytics.company_rating_updated.v1.json` |
| `ai.appointment_recommendation_created` | `analytics.events` | `ai.appointment_recommendation_created` | ai-service | backend-projection-service | `ai.appointment_recommendation_created.v1.json` |
| `ai.company_insight_created` | `analytics.events` | `ai.company_insight_created` | ai-service | backend-projection-service | `ai.company_insight_created.v1.json` |
| `ai.job_failed` | `analytics.events` | `ai.job_failed` | ai-service | **Confirmed: no consumer for now.** Schema exists and ai-service may still publish it, but nothing in `services/backend-projection-service` (or elsewhere) needs to consume it yet. Do not add a consumer without a confirmed need. | `ai.job_failed.v1.json` |
| `auth.user_registered` | `domain.events` | `auth.user_registered` | auth-service (via its own outbox) | users-service (creates profile idempotently) | `auth.user_registered.v1.json` |

Routing confirmed from `backend/src/infrastructure/outbox/event-routing.ts` — the
`domainEventRouting` map currently has exactly these 6 entries: `appointment.requested`,
`appointment.approved`, `appointment.rejected`, `appointment.completed`,
`appointment.cancelled`, `review.received`. Nothing else is wired through the outbox
today.

## Planned — schema does not exist yet (contract-first gate applies)

| Event | Intended exchange | Publisher (future) | Consumer (future) | Phase | Status |
|---|---|---|---|---|---|
| `auth.user_logged_in` | `domain.events` | auth-service | (none confirmed — analytics/audit candidate) | 2 | Not blocking; confirm need before writing schema |
| `auth.session_revoked` | `domain.events` | auth-service | (none confirmed) | 2 | Not blocking; confirm need before writing schema |
| `company.created` | `domain.events` | companies-service | appointments-service (projection) | 4 | **Blocks Task 4.3** |
| `company.updated` | `domain.events` | companies-service | appointments-service (projection) | 4 | **Blocks Task 4.3** |
| `company.published` | `domain.events` | companies-service | (none confirmed — public listing candidate) | 4 | Confirm need before writing schema |
| `company-member.added` | `domain.events` | company-members-service | auth-service (membership projection) | 5 | **Blocks Task 5.3, 5.4** |
| `company-member.removed` | `domain.events` | company-members-service | auth-service (membership projection) | 5 | **Blocks Task 5.3, 5.4** |
| `company-member.role_changed` | `domain.events` | company-members-service | auth-service (membership projection) | 5 | **Blocks Task 5.3, 5.4** |
| `company-member.suspended` | `domain.events` | company-members-service | auth-service (membership projection) | 5 | **Excluded — confirmed.** `CompanyMemberStatus` enum has only `active`/`removed` (verified in `company-member.entity.ts`). Do not add this event or schema; it implies a status that does not exist. |
| `specialist.created` | `domain.events` | specialists-service | appointments-service (projection) | 6 | **Blocks Task 6.2** |
| `specialist.updated` | `domain.events` | specialists-service | appointments-service (projection) | 6 | **Blocks Task 6.2** |
| `specialist.published` | `domain.events` | specialists-service | (none confirmed) | 6 | Confirm need |
| `company-specialist.requested` | `domain.events` | company-specialists-service | (none confirmed — notifications candidate) | 7 | Confirm need |
| `company-specialist.accepted` | `domain.events` | company-specialists-service | appointments-service (projection) | 7 | **Blocks Task 7.2** |
| `company-specialist.rejected` | `domain.events` | company-specialists-service | (none confirmed) | 7 | Confirm need |
| `company-specialist.removed` | `domain.events` | company-specialists-service | appointments-service (projection) | 7 | **Blocks Task 7.2** |
| `service.created` | `domain.events` | services-catalog-service | appointments-service (projection) | 8 | **Blocks Task 8.3** |
| `service.updated` | `domain.events` | services-catalog-service | appointments-service (projection) | 8 | **Blocks Task 8.3** |
| `specialist-service.assigned` | `domain.events` | services-catalog-service | appointments-service (projection) | 8 | **Blocks Task 8.3** |
| `specialist-service.removed` | `domain.events` | services-catalog-service | appointments-service (projection) | 8 | **Blocks Task 8.3** |
| `user.profile_created` | `domain.events` | users-service | (none confirmed) | 3 | Confirm need — may be redundant with `auth.user_registered` |
| `user.profile_updated` | `domain.events` | users-service | (none confirmed) | 3 | Confirm need before writing schema |
| `notification.created` | `domain.events` | notifications-service | (none confirmed) | 11 | Confirm need — notifications-service is currently a pure consumer, not a publisher |
| `email.sent` | `domain.events` | notifications-service | (none confirmed) | 11 | Confirm need |
| `email.failed` | `domain.events` | notifications-service | (none confirmed) | 11 | Confirm need |

**Explicitly excluded — do not add without approval:**

| Event | Why excluded |
|---|---|
| `appointment.no_show` | No `NO_SHOW` status exists in `AppointmentStatus` enum anywhere in the codebase (verified). This is new business functionality, not an extraction of existing behavior. Do not add a schema or publisher until approved as new scope, separate from this migration. |
| `service.deleted` | No `DELETE` endpoint exists for services today (verified in `route-inventory.md`). Same rule — new functionality, not extraction. |

## Naming convention (unchanged from `contracts/events/README.md`)

`<event.type>.v<major>.json` — a breaking payload change bumps the file's major
version and the envelope's `version` field. Consumers can support an old version
during a migration window by checking `version` before decoding `data`.

## Idempotency requirement (unchanged)

Every consumer keeps its own `processed_events(event_id, consumer_name, processed_at)`
table, per `service-ownership.md` rule 5. This applies to every new consumer listed
above (auth-service, users-service, appointments-service projections, etc.) exactly as
it already applies to `notifications-service`, `backend-projection-service`, and
`ai-service`.

## Contract-first hard rule

Before any phase implements a publisher or consumer for an event in the "Planned"
table above:

1. Write the JSON Schema file in `contracts/events/<event.type>.v1.json`, following the
   exact structure of the existing files (see `appointment.requested.v1.json` above as
   the template — `required`, `additionalProperties: false`, explicit `format` on
   UUIDs and timestamps).
2. Add the routing entry to whichever service's outbox routing map applies (mirroring
   `backend/src/infrastructure/outbox/event-routing.ts`).
3. Update `contracts/events/README.md`'s event list.
4. Only then write the publisher/consumer code.

Do not write consumer code "ahead of" the schema on the assumption the shape is
obvious — the `additionalProperties: false` + explicit `required` array pattern used
throughout this repo is deliberate and should be authored first, not inferred from
whatever the first consumer happens to need.

**Stop — awaiting approval before proceeding to Task E.**
