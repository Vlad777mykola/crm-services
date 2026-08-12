# Smoke Checklist — Phase 1 (Traefik Gateway)

Manual verification only, per `smoke-checklist-template.md`. Gateway is Traefik,
routed via its file provider (see `docs/architecture/gateway-routing.md`) — not
nginx, and not Traefik's Docker provider (that failed on Windows/Docker Desktop
with a socket-access error; file provider has no such dependency).

Run **either** mode below — routing behavior should be identical either way, only
the backend host differs.

## 1. Start the stack

**Mode A — everything containerized:**

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.legacy.yml up --build
```

**Mode B — gateway only, backend on the host (faster, recommended day-to-day):**

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml up
```

then in another terminal:

```bash
yarn dev
```

## 2. Health, through the gateway

```bash
curl -i http://localhost:8080/health
curl -i http://localhost:8080/health/live
curl -i http://localhost:8080/health/ready
```

Expected: identical to calling `http://localhost:4000/health*` directly (same status,
same JSON body).

## 3. Auth route reaches legacy

```bash
curl -i http://localhost:8080/auth/me
```

Expected: `401` (no token) — same as calling `:4000` directly, confirms the request
reached legacy-backend and its auth middleware ran, not a gateway-level rejection.

## 4. Public read routes (no auth needed)

```bash
curl -i http://localhost:8080/companies/public
curl -i http://localhost:8080/specialists/public
curl -i http://localhost:8080/services/public
```

Expected: `200` with the same payload shape as calling `:4000` directly.

## 5. Nested/priority-sensitive routes (confirm ordering works)

```bash
# Should NOT be swallowed by the generic /companies fallback (priority 10) -
# these have higher explicit priority (87-100) and should still reach legacy-backend
# identically today, but prove the router that matches is the specific one, not the
# fallback (check Traefik dashboard at :8081 to confirm which router name matched).
curl -i http://localhost:8080/companies/00000000-0000-0000-0000-000000000000/members
curl -i http://localhost:8080/companies/00000000-0000-0000-0000-000000000000/specialists
curl -i http://localhost:8080/companies/00000000-0000-0000-0000-000000000000/specialist-requests

# Should NOT be swallowed by the generic /specialists fallback (priority 10)
curl -i http://localhost:8080/specialists/me/services
curl -i http://localhost:8080/specialists/me/companies

# review sub-paths should not be swallowed by /appointments or /services fallbacks
curl -i -X POST http://localhost:8080/appointments/00000000-0000-0000-0000-000000000000/review
curl -i http://localhost:8080/services/00000000-0000-0000-0000-000000000000/reviews
```

Expected: all reach legacy-backend and return whatever legacy-backend would return
for a nonexistent id (401/404, not a gateway-level 404 from an unmatched router).

## 6. Unknown route

```bash
curl -i http://localhost:8080/unknown-route
```

Expected: `404` from Traefik itself (no router matches) — confirms the gateway isn't
silently forwarding unmatched paths anywhere.

## 7. Register/login through the gateway

```bash
curl -i -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","name":"Smoke Test","password":"Passw0rd!"}'

curl -i -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"Passw0rd!"}'
```

Expected: `201` then `200`, with `accessToken` in the body and a `refreshToken`
cookie set with `path=/auth`.

## 8. Traefik dashboard (local dev only)

Open `http://localhost:8081` — confirm every router listed in
`docker/dev/traefik/dynamic.container.yml` (Mode A) or `dynamic.host.yml` (Mode B)
shows up with the expected `priority` and points at the `legacy-backend` service,
and that hitting the URLs above in the dashboard's router list highlights the
router you expect (most-specific one), not the generic fallback.

## 9. Frontend config

```txt
VITE_API_URL=http://localhost:8080
```

Run the frontend against this and confirm login/register/browsing companies still
works end-to-end through the gateway.

## Expected overall result

- All requests go through the gateway.
- Legacy-backend still handles everything — no domain has been extracted.
- `X-Request-Id` is present on responses (backend-generated if the client didn't send
  one — see the documented gap in `gateway-routing.md`; Traefik itself does not
  inject one).

## Result

- First real run (Docker provider) failed with a Docker-socket error on
  Windows/Docker Desktop — fixed by switching to the file provider (see
  `gateway-routing.md`).
- After that fix, step 2 (`GET /health` through the gateway) was confirmed
  working: `200 OK`, correct JSON body, `X-Request-Id` present on the response.
- Compose files were subsequently reorganized into `docker/dev/` +
  `docker/prod/` (this checklist's commands above reflect the new paths).
  **Steps 3–9 have not yet been re-run against the reorganized paths — run
  the rest of this checklist and report back before Phase 2 is approved.**
