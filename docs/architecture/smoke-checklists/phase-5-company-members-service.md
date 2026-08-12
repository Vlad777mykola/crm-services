# Smoke Checklist — Phase 5 (company-members-service + auth projection)

Manual verification only. `/companies/:id/members/*` now routes to
company-members-service; auth-service's permission checks (elsewhere, not
built yet) would read `auth_membership_projection`, fed by events.

## 1. Start the stack

Add `--profile company-members` (see `docker/dev/README.md`) alongside
`events`/`auth`/`companies`, or run `company-members-service` + its
`outbox-publisher-company-members` instance on the host.

## 2. Owner row auto-created on company creation

```bash
curl -i -X POST http://localhost:8080/companies \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Acme Salon 2"}'
# capture the returned companyId

curl -i http://localhost:8080/companies/<companyId>/members -H "Authorization: Bearer <accessToken>"
# Expected: 200, data == [{ role: "owner", userId: <the creator>, user: {...} }]
# (may take up to a second - eventually consistent via company.created -> company-member.added)
```

## 3. Invite a manager

```bash
curl -i -X POST http://localhost:8080/companies/<companyId>/members/invite \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"email":"someone-with-an-account@example.com"}'
# Expected: 201, data.role == "manager" (only works if that email already has a users_schema row)

curl -i -X POST http://localhost:8080/companies/<companyId>/members/invite \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"email":"no-such-user@example.com"}'
# Expected: 404 "No user found with this email"
```

## 4. Remove a member

```bash
curl -i -X DELETE http://localhost:8080/companies/<companyId>/members/<memberId> \
  -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, data.status == "removed"

curl -i -X DELETE http://localhost:8080/companies/<companyId>/members/<ownerMemberId> \
  -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 403 "The company owner cannot be modified or removed"
```

## 5. Event flow into auth's projection

```txt
[event check]
- company_members_schema.outbox_events has company-member.added rows reaching
  status = published.
- auth_schema.auth_membership_projection has a row (companyId, userId, role=owner)
  matching step 2, and no row for the member removed in step 4.
```

```bash
docker exec -it $(docker ps -qf name=postgres) psql -U postgres -d crm -c \
  "SELECT * FROM auth_schema.auth_membership_projection ORDER BY \"createdAt\" DESC LIMIT 5;"
```

## Known gaps (flagged, not fixed in this phase)

- companies-service's own permission checks (PATCH/status-history, "my
  companies") still read `company_members_schema.company_members` directly
  (cross-schema, read-only) instead of a local projection — see
  `services/companies-service/src/db/legacy-company-members-bridge.ts`.
- `company-members-service`'s "find user by email" / member display names
  read `users_schema` directly — see
  `services/company-members-service/src/db/member-repository.ts`.
- Rollback fallback for auth-service's permission checks, if this phase is
  rolled back, is not automated — document/verify manually before relying on
  it (checklist Phase 5 rollback note).

## Result

_Fill in after running the steps above._
