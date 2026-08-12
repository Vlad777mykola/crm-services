# companies-service

## Purpose

Owns company profile data — extracted from `backend/src/modules/companies/`
per Phase 4 of `docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Auth |
|---|---|---|
| POST | `/companies` | required |
| GET | `/companies/public` | none |
| GET | `/companies/me` | required |
| GET | `/companies/:companyId` | optional (draft/suspended only visible to active members) |
| GET | `/companies/:companyId/status-history` | required (owner/manager) |
| PATCH | `/companies/:companyId` | required (owner/manager) |

`/companies/:companyId/members/*`, `/services/*`, `/appointments/*`,
`/specialist*`, `/reviews`, `/summary` are **not** owned here — they stay on
legacy-backend until their own phases (5, 7, 8, 9, 10, 15).

## Owned tables / schema

`companies_schema`:

- `companies`
- `company_status_history` — new, per-domain table (never writes to legacy's shared `status_history_entries`).
- `processed_events`, `outbox_events` — reserved/outbox plumbing.

## Known temporary compromise: `company_members` read bridge

As of Phase 5, `company-members-service` owns `company_members_schema.company_members`
(and creates the `owner` row itself, via its own `company.created` consumer —
this service no longer writes membership rows). This service still reads
that schema directly (cross-schema, same Postgres instance, read-only) for
its own authorization needs: owner/manager permission checks on
PATCH/status-history, and `GET /companies/me`. This is intentionally flagged
and not the target architecture — see
[`src/db/legacy-company-members-bridge.ts`](src/db/legacy-company-members-bridge.ts).
A future cleanup could replace this with a local projection fed by
`company-member.*` events, the same pattern auth-service uses for
`auth_membership_projection` (Task 5.4).

## Published events

| Event | When |
|---|---|
| `company.created` | On `POST /companies`. Schema: `contracts/events/company.created.v1.json`. |
| `company.updated` | On `PATCH /companies/:companyId` (profile and/or status change). Schema: `contracts/events/company.updated.v1.json`. |

No confirmed consumer yet (appointments-service, Phase 9, is the likely future
consumer for a local projection) — published now so downstream services don't
block on companies-service adding events later.

## Required environment variables

See `.env.example`. `JWT_ACCESS_SECRET` must match auth-service's/legacy's —
this service only verifies tokens.

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/companies-service/Dockerfile -t crm-companies-service services/companies-service
    docker run -p 4003:4003 --env-file .env crm-companies-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 4. Rollback: repoint the `companies-service-*` Traefik
routers back at `legacy-backend` in all three dynamic-config files — legacy's
own `/companies/*` code is untouched. Companies created only in
`companies_schema` after cutover won't exist on legacy (no backfill policy).
