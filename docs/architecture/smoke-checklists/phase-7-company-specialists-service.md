# Smoke Checklist — Phase 7 (company-specialists-service)

Manual verification only. All 7 company-specialists routes now route to
`company-specialists-service`; `/companies/*` generic fallback stays on
companies-service (Phase 4), and `/specialists/me/services`, `/services/*`,
`/appointments/*`, `/reviews`, `/summary` stay legacy.

## 1. Start the stack

Add `--profile company-specialists` (see `docker/dev/README.md`) alongside
the usual `events`/`auth`/`companies`/`company-members`/`specialists`
profiles, or run `cd services/company-specialists-service && yarn dev` + the
`outbox-publisher-company-specialists` instance on the host. You'll need an
existing company (owner token) and specialist profile (specialist token).

## 2. Company sends a request, specialist accepts

```bash
# Using an owner's accessToken and a specialistProfileId:
curl -i -X POST http://localhost:8080/companies/<companyId>/specialists/requests \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"specialistProfileId":"<specialistProfileId>"}'
# Expected: 201, data.status == "pending"

curl -i http://localhost:8080/companies/<companyId>/specialist-requests -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, includes the pending request

curl -i http://localhost:8080/specialists/me/company-requests -H "Authorization: Bearer <specialistAccessToken>"
# Expected: 200, includes the pending request

curl -i -X POST http://localhost:8080/specialists/me/company-requests/<requestId>/accept \
  -H "Authorization: Bearer <specialistAccessToken>"
# Expected: 200, data.status == "accepted"

curl -i http://localhost:8080/companies/<companyId>/specialists
# Expected: 200, includes the specialist (status active)

curl -i http://localhost:8080/specialists/me/companies -H "Authorization: Bearer <specialistAccessToken>"
# Expected: 200, includes this company
```

## 3. Reject path

```bash
curl -i -X POST http://localhost:8080/companies/<companyId>/specialists/requests \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"specialistProfileId":"<anotherSpecialistProfileId>"}'
curl -i -X POST http://localhost:8080/specialists/me/company-requests/<requestId>/reject \
  -H "Authorization: Bearer <anotherSpecialistAccessToken>"
# Expected: 200, data.status == "rejected"; specialist does NOT appear in /companies/:id/specialists
```

## 4. Permission check (non-member)

```bash
curl -i -X POST http://localhost:8080/companies/<companyId>/specialists/requests \
  -H "Authorization: Bearer <someoneElsesAccessToken>" -H "Content-Type: application/json" \
  -d '{"specialistProfileId":"<specialistProfileId>"}'
# Expected: 403
```

## 5. Sub-paths stay legacy/other services

```bash
curl -i http://localhost:8080/specialists/me/services
curl -i http://localhost:8080/services/public
```

Expected: served by legacy-backend, unaffected by this phase.

## 6. Event flow

```txt
[event check]
- company_specialists_schema.outbox_events has a company-specialist.accepted
  row reaching status = published once outbox-publisher-company-specialists runs.
```

No consumers exist yet for `company-specialist.accepted` — expected until
Phase 9 (appointments-service).

## Result

_Fill in after running the steps above._
