# Smoke Checklist — Phase 3 (users-service HTTP)

Manual verification only. `/users/me` (GET/PATCH) and `/users/:id` now route to
`users-service`; `POST /users` stays on legacy-backend (Q5).

## 1. Start the stack

Same as Phase 2 (see `phase-2-auth-service.md` §1) — `users-service` already
needs to be running for its consumer; this phase just adds routes on top.

## 2. Get / update own profile

```bash
# Using an accessToken from /auth/register or /auth/login (auth-service):
curl -i http://localhost:8080/users/me -H "Authorization: Bearer <accessToken>"
# Expected: 200 { message: "Current user profile", data: { id, email, name, phone, city, bio, status, createdAt, updatedAt } }

curl -i -X PATCH http://localhost:8080/users/me \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","city":"Chisinau"}'
# Expected: 200, data.name == "Updated Name", data.city == "Chisinau"

curl -i http://localhost:8080/users/me
# Expected: 401 (no Authorization header)
```

## 3. Get user by id (public)

```bash
curl -i http://localhost:8080/users/<userId>
# Expected: 200, same shape as /users/me
curl -i http://localhost:8080/users/00000000-0000-0000-0000-000000000000
# Expected: 404 "User not found"
```

## 4. `POST /users` still on legacy (unchanged, Q5)

```bash
curl -i -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{"email":"legacy-user@example.com","name":"Legacy User"}'
```

Expected: identical behavior to before — served by legacy-backend, not users-service.

## Expected overall result

- `GET/PATCH /users/me`, `GET /users/:id` fully served by users-service.
- `POST /users` unaffected (legacy-backend).
- Rollback: repoint `users-service-me`/`users-service-by-id` Traefik routers back
  at `legacy-backend` in all three dynamic-config files.

## Result

_Fill in after running the steps above._
