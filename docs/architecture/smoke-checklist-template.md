# Manual Smoke Checklist — Template

## Goal

Verify each phase manually, without adding automated test files (global rule: no new
tests unless explicitly requested). This replaces "write tests" with "write down
exactly what to click/curl and what you should see."

## Format

For every route touched by a phase, document:

```txt
<METHOD> <path>
Gateway routes to: <service currently serving this path>
Auth required: yes/no
Sample request body: <if applicable>
Expected status: <code>
Expected response shape: <short description>
Rollback route: <path> -> legacy-backend (how to flip it back)
```

Store each phase's filled-in checklist as
`docs/architecture/smoke-checklists/phase-<n>-<name>.md` once that phase starts, so
there's a durable manual-QA record per phase without ever touching a test framework.

## Worked example (Phase 2 — auth-service)

```txt
POST /auth/register
Gateway routes to: auth-service
Auth required: no
Sample body: { "email": "a@test.com", "name": "A", "password": "Passw0rd!" }
Expected status: 201
Expected response: { message, data: { user, accessToken } } + refreshToken cookie set (path=/auth)
Rollback route: /auth/register -> legacy-backend

POST /auth/login
Gateway routes to: auth-service
Auth required: no
Sample body: { "email": "a@test.com", "password": "Passw0rd!" }
Expected status: 200
Expected response: { message, data: { user, accessToken } } + refreshToken cookie
Rollback route: /auth/login -> legacy-backend

POST /auth/refresh
Gateway routes to: auth-service
Auth required: no (relies on refreshToken cookie)
Expected status: 200
Expected response: { message, data: { accessToken } } + rotated refreshToken cookie
Rollback route: /auth/refresh -> legacy-backend

POST /auth/logout
Gateway routes to: auth-service
Auth required: no (relies on refreshToken cookie)
Expected status: 200
Expected response: { message } + refreshToken cookie cleared
Rollback route: /auth/logout -> legacy-backend

GET /auth/me
Gateway routes to: auth-service
Auth required: yes (Bearer accessToken)
Expected status: 200
Expected response: { message, data: user }
Rollback route: /auth/me -> legacy-backend

[event check, not an HTTP route]
After POST /auth/register succeeds:
  auth-service's outbox_events table has one row, event_type = auth.user_registered, status = pending -> published
  users-service's processed_events table gets a row for that event_id after its consumer runs
  users-service's users/user_profiles table has a new row for that user
```

## Worked example (Phase 1 — gateway, no service change yet)

```txt
GET /health
Gateway routes to: legacy-backend
Auth required: no
Expected status: 200
Expected response: { status: "ok", uptime, timestamp }
Rollback route: n/a (gateway is new; removing it means pointing frontend back at :4000 directly)

POST /auth/login
Gateway routes to: legacy-backend
Auth required: no
Sample body: { "email": "existing@test.com", "password": "..." }
Expected status: 200 (identical to calling backend directly on :4000)
Rollback route: n/a — this phase doesn't change ownership, only adds a proxy hop

GET /companies/public
Gateway routes to: legacy-backend
Auth required: no
Expected status: 200, same payload shape as calling :4000 directly

[header check]
Any request through the gateway should carry X-Request-Id in the response/logs,
even though legacy-backend doesn't originate it yet — confirm gateway generates one
if the client didn't send one, and that legacy-backend's request logger echoes it if
request-logger.ts is extended to read it (Task 1.3 — best-effort, not blocking).
```

## Rules

- No automated test files, no new test framework config.
- Every route touched by a phase must appear in that phase's checklist before the
  phase's stop point.
- Include event/table side effects where relevant (not just HTTP status codes) — see
  the Phase 2 example above.
- Checklist entries are living documentation, not throwaway notes — keep them in
  `docs/architecture/smoke-checklists/` for future reference/regression-by-hand.

## Done when

Every phase in `microservices-extraction-checklist.md` references this template and
produces its own filled-in checklist file before that phase's "Done when" is
considered satisfied.
