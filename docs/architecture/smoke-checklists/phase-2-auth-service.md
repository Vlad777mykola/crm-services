# Smoke Checklist — Phase 2 (auth-service + users-service consumer)

Manual verification only, per `smoke-checklist-template.md`. `/auth/*` now routes to
`auth-service`; `/users/*` stays on `legacy-backend` until Phase 3. `users-service` has
no HTTP route of its own yet — verified via its consumer side effects (tables), not curl.

## 1. Start the stack

**Fast loop (recommended):**

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml --profile events up
```

then, on the host, in separate terminals:

```bash
yarn dev                              # frontend + legacy-backend
cd services/auth-service && yarn dev
cd services/users-service && yarn dev
cd services/outbox-publisher && DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm?options=-c%20search_path%3Dauth_schema" HEALTH_PORT=4501 yarn dev
```

(first time only: `cp` each service's `.env.example` to `.env` — see `docker/dev/README.md`)

**Container-parity mode (everything containerized):**

```bash
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.legacy.yml --profile events up --build
```

## 2. Health — auth-service, users-service, outbox-publisher-auth

```bash
curl -i http://localhost:4001/health/live
curl -i http://localhost:4001/health/ready
curl -i http://localhost:4002/health/live
curl -i http://localhost:4002/health/ready
curl -i http://localhost:4501/health/live
curl -i http://localhost:4501/health/ready
```

Expected: `200` for every `/health/live`. `/health/ready` is `200` once Postgres (and,
for users-service/outbox-publisher-auth, RabbitMQ) are reachable, `503` otherwise.

## 3. Register through the gateway

```txt
POST /auth/register
Gateway routes to: auth-service
Auth required: no
Sample body: { "email": "smoke@example.com", "name": "Smoke Test", "password": "Passw0rd!" }
Expected status: 201
Expected response: { message: "Registered", data: { user: { id, email, createdAt }, accessToken } } + refreshToken cookie (path=/auth)
Rollback route: /auth/register -> legacy-backend
```

```bash
curl -i -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","name":"Smoke Test","password":"Passw0rd!"}'
```

Note the difference from legacy: `data.user` is now `{ id, email, createdAt }` only —
no `name`/`phone`/`city`/`bio`/`status` (those live in users-service, not reachable via
HTTP until Phase 3 — see Task 2.4).

## 4. Login, refresh, logout, me

```txt
POST /auth/login
Gateway routes to: auth-service
Sample body: { "email": "smoke@example.com", "password": "Passw0rd!" }
Expected status: 200
Expected response: { message: "Logged in", data: { user, accessToken } } + refreshToken cookie
Rollback route: /auth/login -> legacy-backend

POST /auth/refresh
Gateway routes to: auth-service
Auth required: no (relies on refreshToken cookie)
Expected status: 200
Expected response: { message: "Session refreshed", data: { accessToken } } + rotated refreshToken cookie
Rollback route: /auth/refresh -> legacy-backend

POST /auth/logout
Gateway routes to: auth-service
Expected status: 200
Expected response: { message: "Logged out" } + refreshToken cookie cleared
Rollback route: /auth/logout -> legacy-backend

GET /auth/me
Gateway routes to: auth-service
Auth required: yes (Bearer accessToken)
Expected status: 200
Expected response: { message: "Current user", data: { id, email, createdAt } }
Rollback route: /auth/me -> legacy-backend
```

```bash
curl -i -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"Passw0rd!"}' \
  -c cookies.txt

curl -i -X POST http://localhost:8080/auth/refresh -b cookies.txt -c cookies.txt

# Use the accessToken returned by login/refresh above:
curl -i http://localhost:8080/auth/me -H "Authorization: Bearer <accessToken>"

curl -i -X POST http://localhost:8080/auth/logout -b cookies.txt -c cookies.txt
```

## 5. Wrong password / duplicate email

```bash
curl -i -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","name":"Dup","password":"Passw0rd!"}'
# Expected: 409 "A user with this email already exists"

curl -i -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"WrongPassword!"}'
# Expected: 401 "Invalid email or password"
```

## 6. Event flow — auth.user_registered end to end

After step 3 (register) succeeds:

```txt
[event check, not an HTTP route]
- auth_schema.outbox_events (in the shared `crm` Postgres) has one row for this
  registration: eventType = auth.user_registered, status: pending -> published
  (published once outbox-publisher-auth picks it up).
- users_schema.processed_events gets a row keyed by that event's id once
  users-service's consumer runs.
- users_schema.users has a new row with id = the registered user's id (matches
  auth_schema.auth_identities.id and the accessToken's `sub` claim).
- users_schema.user_profiles has a matching row with name = "Smoke Test".
```

```bash
docker exec -it $(docker ps -qf name=postgres) psql -U postgres -d crm -c \
  "SELECT \"eventType\", \"status\", \"publishedAt\" FROM auth_schema.outbox_events ORDER BY \"createdAt\" DESC LIMIT 5;"

docker exec -it $(docker ps -qf name=postgres) psql -U postgres -d crm -c \
  "SELECT u.id, u.email, p.name FROM users_schema.users u JOIN users_schema.user_profiles p ON p.\"userId\" = u.id ORDER BY u.\"createdAt\" DESC LIMIT 5;"
```

Expected: the outbox row reaches `status = published` within a few seconds
(`POLL_INTERVAL_MS`, default 1000ms), and the matching `users`/`user_profiles` rows
exist with the same `id`/`name` used at registration.

## 7. Legacy JWT compatibility (Task 2.6)

```bash
# Using the accessToken from step 4 (issued by auth-service):
curl -i http://localhost:8080/companies/public -H "Authorization: Bearer <accessToken>"
```

Expected: `200` — confirms legacy-backend's `requireAuth` accepts a token issued by
auth-service (same `JWT_ACCESS_SECRET`, same `{ sub: userId }` payload shape). This
route doesn't require auth, so also try one that does (e.g. a company-scoped route
that reads `req.auth.userId`) if you have a legacy account/company to test against.

## 8. `/users/*` untouched (still legacy)

```bash
curl -i http://localhost:8080/users -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"legacy-user@example.com","name":"Legacy User"}'
```

Expected: identical behavior to before Phase 2 — this route is unaffected (still on
legacy-backend, per Q5 / Task 3.1).

## 9. Unknown auth sub-path

```bash
curl -i http://localhost:8080/auth/does-not-exist
```

Expected: `404` from **auth-service** (its own `not-found-handler`), not from
Traefik or legacy — confirms the whole `/auth` prefix is routed to auth-service now,
not just the 5 known sub-paths.

## Expected overall result

- `/auth/*` fully served by auth-service; response shape for `user` is intentionally
  minimal (no profile fields) until Phase 3.
- `auth.user_registered` is published (via `outbox-publisher-auth`) and consumed
  idempotently by users-service, which creates a matching profile.
- legacy-backend still accepts auth-service-issued JWTs for every not-yet-extracted
  route (shared `JWT_ACCESS_SECRET`).
- `/users/*` and everything else unaffected, still legacy.

## Known gaps (flagged, not fixed in this phase — see README "Current migration status")

- Legacy's own `users` table does not gain a row for accounts created via
  auth-service after cutover (it never has since Phase 2 doesn't touch legacy code).
  Any not-yet-extracted legacy feature that does a DB-level join/FK against `users`
  for a *newly registered* user (e.g. creating a company as that user, if that legacy
  code assumes a `users` row exists) may behave unexpectedly. Not exercised by this
  checklist; call out before Phase 4/5 if it becomes a blocker.
- `auth.user_logged_in` / `auth.session_revoked` are intentionally not implemented
  (event-catalog.md: no confirmed consumer yet).

## Result

_Fill in after running the steps above — actual output, any deviations from expected,
and whether Phase 3 is approved to start._
