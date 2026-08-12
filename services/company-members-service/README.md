# company-members-service

## Purpose

Owns company membership — extracted from
`backend/src/modules/company-members/` per Phase 5 of
`docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Auth |
|---|---|---|
| GET | `/companies/:companyId/members` | owner/manager |
| POST | `/companies/:companyId/members/invite` | owner only |
| PATCH | `/companies/:companyId/members/:memberId` | owner only (status only, not role) |
| DELETE | `/companies/:companyId/members/:memberId` | owner only |

Legacy parity note: "invite" has no pending-invitation step today — if a user
with that email exists, they're immediately added as an active `manager`.
This service preserves that behavior exactly (no new functionality without
approval); `member_invitations` exists but is unused/reserved.

## Owned tables / schema

`company_members_schema`: `company_members`, `member_invitations` (reserved,
unused), `processed_events`, `outbox_events`.

## Consumed events

| Event | What happens |
|---|---|
| `company.created` | Auto-creates the `owner` row for `createdByUserId`. Replaces what used to be a same-transaction insert in companies-service (see `services/companies-service` — that direct write was removed in this phase). |

## Published events

| Event | When |
|---|---|
| `company-member.added` | Owner row created (via `company.created`), or a manager is invited/reactivated. |
| `company-member.removed` | A member's status is set to `removed` (via PATCH or DELETE). |

`company-member.role_changed` schema exists but is **not published** — no
code path here changes a member's role after creation (legacy parity).

## Known temporary compromise

`GET .../members` (for display names) and `POST .../members/invite`
(email → userId lookup) read `users_schema` directly (cross-schema, same
Postgres instance) — there's no public "find user by email" endpoint on
users-service. Flagged in
[`src/db/member-repository.ts`](src/db/member-repository.ts); not required to
fix by the checklist, but worth revisiting.

Consumers of this service's membership data for **authorization** (not
display) should prefer their own local projection fed by
`company-member.*` events, the same pattern as auth-service's
`auth_membership_projection` (Task 5.4) and companies-service's own
permission checks (Task 5.4 note in `companies-service/README.md`).

## Required environment variables

See `.env.example`.

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/company-members-service/Dockerfile -t crm-company-members-service services/company-members-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 5. Rollback: repoint the `company-members-service` Traefik
router back at `legacy-backend` — legacy's own `/companies/:id/members/*` code
is untouched. Fallback for auth-service's permission checks if rolled back:
document explicitly before going live (checklist Phase 5 rollback note) — for
now, auth-service falls back to allowing any authenticated request through
until re-verified against legacy (no automatic re-sync of the projection).
