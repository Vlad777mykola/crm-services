# gateway

## Purpose

Traefik-based reverse proxy in front of legacy-backend (and, as each domain is
extracted, in front of the new services). The frontend and all external clients talk
only to the gateway; nothing else is public. See
`docs/architecture/gateway-routing.md` for the routing/priority rules and
`docs/architecture/url-convention.md` for the no-`/api`-prefix rule.

**No custom image.** The gateway runs the official `traefik:v3.0` image directly —
there is nothing to build in this folder. Static configuration lives in each
compose file's `command:` block (`docker/dev/compose.gateway.yml`,
`docker/dev/compose.legacy.yml`, `docker/prod/compose.yml`); dynamic routing rules
live in Traefik's file provider (`docker/dev/traefik/*.yml`,
`docker/prod/traefik/dynamic.yml`), not Docker labels — see
`docs/architecture/gateway-routing.md` for why.

## Owned routes

None — the gateway routes every path in `docs/architecture/route-inventory.md`, it
does not own any of them. As of Phase 8, `/auth/*` points at `auth-service`;
`/users/me` and `/users/:id` point at `users-service` (`POST /users` stays on
legacy-backend, Q5); the 6 company-profile routes point at `companies-service`;
`/companies/:id/members/*` points at `company-members-service`; the 6
specialist-profile routes (`POST /specialists/profile`, `/specialists/me`,
`/specialists/me/status-history`, `/specialists/public`,
`/specialists/:specialistId`) point at `specialists-service`; the 7
company-specialists routes (`/companies/:id/specialists/requests`,
`/companies/:id/specialist-requests`, `/companies/:id/specialists`,
`/specialists/me/company-requests*`, `/specialists/me/companies`) point at
`company-specialists-service`; `/companies/:id/services*`, `/services/public`,
`/services/:serviceId`, `/services/:serviceId/specialists*`, and
`/specialists/me/services` point at `services-catalog-service`; every other
route still points at `legacy-backend`. Each later phase changes only the
`service=`/port target for that domain's routers, not the path list or
priority values.

## Owned tables / schema

None. The gateway has no database.

## Consumed events / Published events

None. The gateway is HTTP-only.

## Required environment variables

None. Traefik's static config is passed via `command:` args in each compose file;
dynamic routing comes from the file provider (`--providers.file.filename=...`),
not environment variables and not Docker socket access.

## Local run

```bash
# fast day-to-day loop - gateway only, backend on the host via `yarn dev`
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml up

# or, container-parity mode - everything containerized
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.legacy.yml up --build
```

No Docker socket access required for either mode - see
`docs/architecture/gateway-routing.md` for why (file provider, not Docker
provider).

## Docker run

Not applicable as a standalone build — see "Local run" above. The image is pulled,
not built.

## Health endpoints

The gateway itself has no `/health/live`/`/health/ready` of its own — health checks
are per-backend (`GET /health`, `/health/live`, `/health/ready` all route through to
whichever service currently owns that path). The Traefik dashboard at `:8081` (local
dev only, see `gateway-routing.md`) shows live router/service status if needed.

## Current migration status

**Phase 8.** `/auth/*` routes to `auth-service:4001`; `/users/me` and
`/users/:id` route to `users-service:4002` (`POST /users` stays on
legacy-backend, Q5); the 6 company-profile routes route to
`companies-service:4003`; `/companies/:id/members/*` routes to
`company-members-service:4004`; the 6 specialist-profile routes
(`POST /specialists/profile`, `/specialists/me`, `/specialists/me/status-history`,
`/specialists/public`, `/specialists/:specialistId`) route to
`specialists-service:4005`; the 7 company-specialists routes
(`/companies/:id/specialists/requests`, `/companies/:id/specialist-requests`,
`/companies/:id/specialists`, `/specialists/me/company-requests*`,
`/specialists/me/companies`) route to `company-specialists-service:4006`;
`/companies/:id/services*`, `/services/public`, `/services/:serviceId`,
`/services/:serviceId/specialists*`, and `/specialists/me/services` route to
`services-catalog-service:4007` (`/appointments/*`, `/reviews`, `/summary`
stay legacy); every other route still routes to `legacy-backend:4000` via
Traefik, using explicit per-router
`priority` values (not rule order) so sub-paths already resolve correctly
ahead of their generic fallbacks — see `docker/dev/traefik/`,
`docker/prod/traefik/dynamic.yml`, and `docs/architecture/gateway-routing.md`.

Rollback: repoint the relevant router's `service:` target back at
`legacy-backend` in all three dynamic-config files (see `gateway-routing.md`) —
legacy-backend's own code for these paths is untouched. Any accounts/
profiles/companies created only in the new schemas after cutover won't exist
on legacy, per the "no backfill" data policy
(`docs/architecture/table-ownership-matrix.md`).
