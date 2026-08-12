# Smoke Checklist — Phase 4 (companies-service)

Manual verification only. All 6 company-profile routes now route to
`companies-service`; `/companies/:id/members/*`, `/services/*`,
`/appointments/*`, `/specialist*`, `/reviews`, `/summary` stay legacy.

## 1. Start the stack

Add `--profile companies` (see `docker/dev/README.md`) alongside the usual
`events`/`auth` profiles, or run `cd services/companies-service && yarn dev`
+ the `outbox-publisher-companies` instance on the host.

## 2. Create / read / update a company

```bash
# Using an accessToken from auth-service:
curl -i -X POST http://localhost:8080/companies \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Acme Salon"}'
# Expected: 201, data.status == "draft", data.slug == "acme-salon"

curl -i http://localhost:8080/companies/me -H "Authorization: Bearer <accessToken>"
# Expected: 200, data == [{ role: "owner", company: {...} }]

curl -i -X PATCH http://localhost:8080/companies/<companyId> \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"status":"published"}'
# Expected: 200, data.status == "published"

curl -i http://localhost:8080/companies/public
# Expected: 200, the company now appears (status == published)

curl -i http://localhost:8080/companies/<companyId>/status-history -H "Authorization: Bearer <accessToken>"
# Expected: 200, two entries: null->draft, draft->published
```

## 3. Permission check (non-member)

```bash
curl -i -X PATCH http://localhost:8080/companies/<companyId> \
  -H "Authorization: Bearer <someoneElsesAccessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Hijack"}'
# Expected: 403
```

## 4. Sub-paths stay legacy

```bash
curl -i http://localhost:8080/companies/<companyId>/members
curl -i http://localhost:8080/companies/<companyId>/services
```

Expected: served by legacy-backend, unaffected by this phase.

## 5. Event flow

```txt
[event check]
- companies_schema.outbox_events has company.created then company.updated rows,
  both reaching status = published once outbox-publisher-companies runs.
```

## Known gap (flagged, not fixed in this phase, resolved in Phase 5)

- The `owner` membership row is written directly into legacy's
  `public.company_members` table by companies-service (cross-schema, same
  Postgres instance) — see
  `services/companies-service/src/db/legacy-company-members-bridge.ts`.
  As of Phase 5, this is replaced by company-members-service's own
  `company.created` consumer; see `phase-5-company-members-service.md`.

## Result

_Fill in after running the steps above._
