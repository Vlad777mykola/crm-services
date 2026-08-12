# company-specialists-service

## Purpose

Owns the working relationship between companies and specialists (requests +
active relations) — extracted from
`backend/src/modules/company-specialists/` per Phase 7 of
`docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Auth |
|---|---|---|
| POST | `/companies/:companyId/specialists/requests` | owner/manager |
| GET | `/companies/:companyId/specialist-requests` | owner/manager |
| GET | `/companies/:companyId/specialists` | none |
| GET | `/specialists/me/company-requests` | required |
| GET | `/specialists/me/companies` | required |
| POST | `/specialists/me/company-requests/:requestId/accept` | required |
| POST | `/specialists/me/company-requests/:requestId/reject` | required |

`GET /companies/:companyId/specialists` (active relations) is distinct from
`GET /companies/:companyId/specialist-requests` (pending requests) — same
naming collision noted in `docs/architecture/route-inventory.md`.

## Owned tables / schema

`company_specialists_schema`: `company_specialist_requests`,
`company_specialists`, `processed_events`, `outbox_events`.

## Published events

| Event | When |
|---|---|
| `company-specialist.accepted` | A specialist accepts a pending request (creates/reactivates the active relation). |

`company-specialist.removed` has a contract
(`contracts/events/company-specialist.removed.v1.json`) but is **not
published** — legacy has no code path that removes a relation (no removal
endpoint exists today). `company-specialist.requested`/`.rejected` were not
added — no confirmed consumer (see `docs/architecture/event-catalog.md`).

## Known temporary compromise

Two cross-schema reads, same pattern/rationale as
`services/companies-service/src/db/legacy-company-members-bridge.ts`:

- [`src/db/legacy-company-members-bridge.ts`](src/db/legacy-company-members-bridge.ts) —
  reads `company_members_schema.company_members` directly to check
  owner/manager permission on `POST .../requests` and
  `GET .../specialist-requests`.
- [`src/db/legacy-specialists-bridge.ts`](src/db/legacy-specialists-bridge.ts) —
  reads `specialists_schema.specialist_profiles` directly to validate a
  `specialistProfileId` exists, and to resolve "my specialist profile id"
  from `userId`.

Neither is required to fix by the checklist, but both are candidates for a
future event-fed local projection instead of direct cross-schema reads.

## Required environment variables

See `.env.example`.

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/company-specialists-service/Dockerfile -t crm-company-specialists-service services/company-specialists-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 7. Rollback: repoint the `company-specialists-service`
Traefik routers back at `legacy-backend` in all three dynamic-config files —
legacy's own `/companies/:id/specialists*`, `/specialists/me/company*` code is
untouched. `/companies/*` generic fallback stays pointed at companies-service
(Phase 4), unaffected.
