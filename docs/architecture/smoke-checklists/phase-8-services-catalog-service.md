# Smoke Checklist — Phase 8 (services-catalog-service)

Manual verification only. All 10 routes across the two routers now route to
`services-catalog-service`; `/appointments/*`, `/reviews`, `/summary` stay
legacy.

## 1. Start the stack

Add `--profile services-catalog` (see `docker/dev/README.md`) alongside the
usual `events`/`auth`/`companies`/`company-members`/`specialists`/
`company-specialists` profiles, or run
`cd services/services-catalog-service && yarn dev` + the
`outbox-publisher-services-catalog` instance on the host. You'll need an
owner token, a company, and (for the specialist-assignment steps) an active
company-specialist from Phase 7.

## 2. Create / read / update a service

```bash
curl -i -X POST http://localhost:8080/companies/<companyId>/services \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Haircut","durationMinutes":30,"price":"25.00"}'
# Expected: 201, data.status == "draft"

curl -i http://localhost:8080/companies/<companyId>/services -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, includes the draft service (owner/manager sees all statuses)

curl -i -X PATCH http://localhost:8080/companies/<companyId>/services/<serviceId> \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"status":"published"}'
# Expected: 200, data.status == "published"

curl -i http://localhost:8080/services/public
# Expected: 200, the service now appears

curl -i http://localhost:8080/services/<serviceId>
# Expected: 200 (no auth needed once published)

curl -i http://localhost:8080/companies/<companyId>/services/<serviceId>/status-history -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, two entries: null->draft, draft->published
```

## 3. Assign / list / unassign a specialist

```bash
# <specialistProfileId> must be an ACTIVE company-specialist for this company (Phase 7):
curl -i -X POST http://localhost:8080/services/<serviceId>/specialists \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"specialistProfileId":"<specialistProfileId>"}'
# Expected: 201

curl -i http://localhost:8080/services/<serviceId>/specialists
# Expected: 200, includes the assignment

curl -i http://localhost:8080/specialists/me/services -H "Authorization: Bearer <specialistAccessToken>"
# Expected: 200, includes this service

curl -i -X DELETE http://localhost:8080/services/<serviceId>/specialists/<specialistProfileId> \
  -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200; specialist no longer appears in GET .../specialists
```

## 4. Permission / visibility checks

```bash
curl -i -X PATCH http://localhost:8080/companies/<companyId>/services/<serviceId> \
  -H "Authorization: Bearer <someoneElsesAccessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Hijack"}'
# Expected: 403

curl -i http://localhost:8080/services/<draftServiceId>
# Expected: 404 (anonymous can't see a draft service)
```

## 5. Sub-paths stay legacy

```bash
curl -i http://localhost:8080/appointments/<appointmentId>/status-history
curl -i http://localhost:8080/services/<serviceId>/reviews
```

Expected: served by legacy-backend, unaffected by this phase.

## 6. Event flow

```txt
[event check]
- services_schema.outbox_events has service.created, service.updated,
  specialist-service.assigned, and specialist-service.removed rows, all
  reaching status = published once outbox-publisher-services-catalog runs.
```

No consumers exist yet — expected until Phase 9 (appointments-service).

## Result

_Fill in after running the steps above._
