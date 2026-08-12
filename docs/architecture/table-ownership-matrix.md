# Table Ownership Matrix

Every table name below is taken directly from `@Entity({ name: '...' })` declarations
in `backend/src/modules/**/*.entity.ts` and `backend/src/infrastructure/outbox/`.
Do not use any table name in a phase document that isn't verified here.

**Correction from earlier drafts:** the sessions table is `auth_sessions`
(not `sessions`) — confirmed from `session.entity.ts`. There is no separate
`auth_users` table; the physical table is `users`, shared today between auth and
profile concerns until Phase 2/3 splits identity from profile.

**Data policy (confirmed by user):** existing data in the current database does not
need to be preserved. Every extracted service creates its own **empty** schema and
starts fresh — no backfill scripts, no dual-write windows, no data-migration
mechanics. This removes an entire category of work from every phase below. The
"Backfill required?" column is kept only to show which tables previously held data
that is now explicitly discarded, not as a to-do.

| Legacy table | Current entity file | Target service owner | Target schema | Phase | Legacy read allowed? | Legacy write allowed? | Data migration | Notes |
|---|---|---|---|---|---|---|---|---|
| `users` | `users/user.entity.ts` | auth-service (identity fields) → users-service (profile fields) | `auth_schema` (identity) + `users_schema` (profile) | 2 (identity) / 3 (profile) | n/a during split | n/a during split | None — new empty tables | Table is **split** structurally (auth keeps id/email/credentials-adjacent fields, users-service gets name/profile fields), but no row data is copied. Existing accounts are discarded; users register again. |
| `auth_identities` | `auth/identities/auth-identity.entity.ts` | auth-service | `auth_schema` | 2 | No | No | None | Password provider identity records. |
| `auth_sessions` | `auth/sessions/session.entity.ts` | auth-service | `auth_schema` | 2 | No | No | None | Refresh token hash storage. Real table name confirmed as `auth_sessions`, not `sessions`. |
| `companies` | `companies/company.entity.ts` | companies-service | `companies_schema` | 4 | No | No | None | |
| `company_members` | `company-members/company-member.entity.ts` | company-members-service | `company_members_schema` | 5 | No | No | None | Auth-service later builds `auth_membership_projection` from this domain's events — does not read this table directly. |
| `specialist_profiles` | `specialists/specialist-profile.entity.ts` | specialists-service | `specialists_schema` | 6 | No | No | None | |
| `company_specialists` | `company-specialists/company-specialist.entity.ts` | company-specialists-service | `company_specialists_schema` | 7 | No | No | None | Active company↔specialist relationship. |
| `company_specialist_requests` | `company-specialists/company-specialist-request.entity.ts` | company-specialists-service | `company_specialists_schema` | 7 | No | No | None | Pending/accepted/rejected requests, distinct from the above. |
| `services` | `services/service.entity.ts` | services-catalog-service | `services_schema` | 8 | No | No | None | Real table name is `services` — **not** `company_services` (that name does not exist in the codebase). |
| `service_specialists` | `services/service-specialist.entity.ts` | services-catalog-service (confirmed, Q13) | `services_schema` | 8 | No | No | None | Real table name is `service_specialists` — **not** `specialist_company_services` (that name does not exist). Join table for which specialist can perform which service. |
| `appointments` | `appointments/appointment.entity.ts` | appointments-service | `appointments_schema` | 9 | No | No | None | |
| `reviews` | `reviews/review.entity.ts` | reviews-service (or appointments-owned, pending decision) | `reviews_schema` | 10 | No | No | None | One review per appointment (`UQ_reviews_appointment`). |
| `notifications` | `notifications/notification.entity.ts` | notifications-service (logical owner today, physical move in Phase 11) | `notifications_schema` | 11 | Backend API read-only until cutover | No (notifications-service already logical owner per `service-ownership.md`) | None | |
| `email_logs` | `emails/email-log.entity.ts` | notifications-service | `notifications_schema` | 11 | Backend API read-only | No | None | |
| `status_history_entries` | `audit/status-history.entity.ts` | **Split across 4 owners** — see `shared-polymorphic-table-audit.md` | split into `companies_schema.company_status_history`, `specialists_schema.specialist_status_history`, `services_schema.service_status_history`, `appointments_schema.appointment_status_history` | 4, 6, 8, 9 | No, per-domain slice only | No, per-domain slice only | None — new empty per-domain tables, old rows discarded | Polymorphic table, discriminator `entityType` ∈ {`company`, `specialist_profile`, `service`, `appointment`}. Do not treat as four pre-existing tables — only one exists today. |
| `outbox_events` | `infrastructure/outbox/outbox-event.entity.ts` | backend today; each extracted service gets its own copy | per-service schema | every phase | n/a | n/a | None (new table per service) | Reuse the `outbox-publisher` image per service (Q8), each pointed at that service's own `DATABASE_URL`. |
| `processed_events` | not yet in main DB (pattern used by `services/*` workers) | each consumer service owns its own | per-service schema | every phase with a consumer | n/a | n/a | None | Already the standard for `notifications-service`, `backend-projection-service`, `ai-service`; new services copy the same shape: `(event_id, consumer_name, processed_at)`. |
| `appointment_recommendation_projections` | `services/backend-projection-service/src/db/projections/schema.ts` | backend-projection-service today → future owner appointments-service (pending Phase 12 decision) | main DB today → `appointments_schema` later | 12 | Backend API read-only | backend-projection-service only | None if moved — rebuilt from new events | AI-derived projection, not a source-of-truth table; safe to drop and rebuild. |
| `company_insight_projections` | `services/backend-projection-service/src/db/projections/schema.ts` | backend-projection-service today → future owner companies-service or read-api (pending Phase 12 decision) | main DB today → TBD later | 12 | Backend API read-only | backend-projection-service only | None if moved | Same category as above. |
| `ai_events` | `services/ai-service/src/db/migrations/001_init.sql` | ai-service | `postgres-ai` (already separate physical instance) | already done | No | No | None | Already isolated — not part of main Postgres, untouched by this migration. |
| `ai_jobs` | same | ai-service | `postgres-ai` | already done | No | No | None | |
| `ai_recommendations` | same | ai-service | `postgres-ai` | already done | No | No | None | |
| `ai_insights` | same | ai-service | `postgres-ai` | already done | No | No | None | |
| `company_daily_stats` | same | ai-service | `postgres-ai` | already done | No | No | None | |
| `specialist_daily_stats` | same | ai-service | `postgres-ai` | already done | No | No | None | |

## Undecided ownership (blockers before their phase starts)

| Item | Question | Options | Recommended |
|---|---|---|---|
| `service_specialists` write/read ownership | Q13 | A: services-catalog-service / B: company-specialists-service / C: specialists-service | **Confirmed: A (services-catalog-service)** — owns `services`, `service_specialists`, `/services/:serviceId/specialists`, `/specialists/me/services` |
| `reviews` ownership | Q10 (prior review) | A: dedicated reviews-service / B: fold into appointments-service / C: fold into companies-service | A, but only after appointments-service is stable |
| `POST /users` endpoint (not a table, but tied to `users` table writes) | Q5 | A: remove / B: internal-only / C: keep on legacy temporarily | C during migration, then B or remove |
| `appointment_recommendation_projections`, `company_insight_projections` future owner | Phase 12 | Move to appointments-service / companies-service vs. keep on backend-projection-service indefinitely | Move once appointments-service and companies-service are stable |

## What "no backfill" simplifies

Because existing data can be discarded, every phase drops these steps entirely from
the earlier plan drafts:

- No `scripts/backfill-*.ts` scripts.
- No dual-read/dual-write windows during cutover.
- No "existing users can still log in after extraction" requirement — legacy accounts
  are gone once auth-service is live; this is acceptable per user direction.
- Rollback for any phase means routing the gateway path back to legacy-backend, not
  restoring migrated data — legacy-backend's own tables are untouched by an extracted
  service's schema, so legacy keeps working on its original data until its routes are
  cut over.
- `shared-polymorphic-table-audit.md`'s split strategy for `status_history_entries`
  no longer needs a backfill `INSERT ... SELECT` step — each new per-domain table
  starts empty.

## Done when

No table in the main Postgres database has an unknown future owner. As of this
document, every table is accounted for except the two `backend-projection-service`
projection tables and the `service_specialists` ownership question, both of which are
explicitly tracked above rather than silently assumed.

**Stop — awaiting approval before proceeding to Task D.**
