# specialists-service

## Purpose

Owns specialist profile data — extracted from
`backend/src/modules/specialists/` per Phase 6 of
`docs/architecture/microservices-extraction-checklist.md`.

## Owned routes

| Method | Path | Auth |
|---|---|---|
| POST | `/specialists/profile` | required |
| GET | `/specialists/me` | required |
| PATCH | `/specialists/me` | required |
| GET | `/specialists/me/status-history` | required |
| GET | `/specialists/public` | none |
| GET | `/specialists/:specialistId` | optional (affects visibility of non-published profiles) |

Not owned here (stay on legacy or move to other services per the checklist):
`/companies/:companyId/specialists*`, `/specialists/me/company-requests*`,
`/specialists/me/companies` (company-specialists-service, Phase 7);
`/specialists/me/services`, `/services/:serviceId/specialists*`
(services-catalog-service, Phase 8, Q13); `/specialists/:specialistId/reviews`
(reviews-service, Phase 10).

## Owned tables / schema

`specialists_schema`: `specialist_profiles`, `specialist_status_history`,
`processed_events`, `outbox_events`.

## Published events

| Event | When |
|---|---|
| `specialist.created` | A specialist profile is created via `POST /specialists/profile`. |
| `specialist.updated` | A specialist profile is updated via `PATCH /specialists/me` (profile fields and/or status). |

No consumers exist yet — reserved for appointments-service (Phase 9) to build
its own specialist projection instead of reading this service's schema
directly.

## Required environment variables

See `.env.example`.

## Local run

    yarn install
    yarn dev

## Docker run

    docker build -f services/specialists-service/Dockerfile -t crm-specialists-service services/specialists-service

## Health endpoints

    GET /health/live
    GET /health/ready

## Current migration status

Extracted in Phase 6. Rollback: repoint the `specialists-service-*` Traefik
routers back at `legacy-backend` in all three dynamic-config files — legacy's
own `/specialists/*` code is untouched.
