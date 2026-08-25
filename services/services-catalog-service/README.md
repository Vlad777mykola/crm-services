# services-catalog-service

## Purpose

Owns both the service catalog and service-specialist assignment (Q13
default) — extracted from `backend/src/modules/services/` per Phase 8 of
`docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Auth |
|---|---|---|
| POST | `/companies/:companyId/services` | owner/manager |
| GET | `/companies/:companyId/services` | optional (draft/suspended only visible to owner/manager) |
| PATCH | `/companies/:companyId/services/:serviceId` | owner/manager |
| GET | `/companies/:companyId/services/:serviceId/status-history` | owner/manager |
| GET | `/services/public` | none |
| GET | `/services/:serviceId` | optional (draft/suspended only visible to owner/manager) |
| POST | `/services/:serviceId/specialists` | owner/manager |
| GET | `/services/:serviceId/specialists` | optional (follows the service's own visibility rule) |
| DELETE | `/services/:serviceId/specialists/:specialistProfileId` | owner/manager |
| GET | `/specialists/me/services` | required |

**No `DELETE /companies/:companyId/services/:serviceId` exists** — not
implemented, matches legacy (no new functionality without approval).

## Owned tables / schema

`services_schema`: `services`, `service_specialists`, `service_status_history`
(new, per `docs/architecture/shared-polymorphic-table-audit.md`),
`company_membership_projection`, `processed_events`, `outbox_events`. Real table names only —
**not** `company_services`/`specialist_company_services` (neither ever
existed, see `docs/architecture/table-ownership-matrix.md`).

## Published events

| Event | When |
|---|---|
| `service.created` | A service is created via `POST /companies/:companyId/services`. |
| `service.updated` | A service is updated via `PATCH .../services/:serviceId` (profile fields and/or status). |
| `specialist-service.assigned` | A specialist is assigned to a service. |
| `specialist-service.removed` | A specialist is unassigned from a service. |

## Consumed events

| Event | Purpose |
|---|---|
| `company-member.added` | Upserts local owner/manager membership projection. |
| `company-member.role_changed` | Updates local owner/manager membership projection. |
| `company-member.removed` | Removes the local membership projection row. |

## Known temporary compromise

Two cross-schema reads, same pattern/rationale as other services in this
phase of the migration:

- [`src/db/legacy-specialists-bridge.ts`](src/db/legacy-specialists-bridge.ts) —
  resolves "my specialist profile id" from `userId` for `GET /specialists/me/services`.
- [`src/db/legacy-company-specialists-bridge.ts`](src/db/legacy-company-specialists-bridge.ts) —
  checks a specialist is an active company-specialist before assigning them to
  a service.

The company-members bridge has been replaced by the local
`company_membership_projection` table fed from company-member domain events.
The remaining bridges are candidates for future event-fed local projections
instead of direct cross-schema reads.

## Required environment variables

See `.env.example`.

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/services-catalog-service/Dockerfile -t crm-services-catalog-service services/services-catalog-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 8. Rollback: repoint the `services-catalog-service-*`
Traefik routers back at `legacy-backend` in all three dynamic-config files —
legacy's own `/companies/:id/services*`, `/services/*` code is untouched.
