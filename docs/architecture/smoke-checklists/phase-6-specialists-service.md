# Smoke Checklist — Phase 6 (specialists-service)

Manual verification only. The 6 specialist-profile routes now route to
`specialists-service`; `/companies/:id/specialists*`,
`/specialists/me/company-requests*`, `/specialists/me/companies`,
`/specialists/me/services`, `/services/*`, `/appointments/*`, `/reviews`,
`/summary` stay legacy.

## 1. Start the stack

Add `--profile specialists` (see `docker/dev/README.md`) alongside the usual
`events`/`auth` profiles, or run `cd services/specialists-service && yarn dev`
+ the `outbox-publisher-specialists` instance on the host.

## 2. Create / read / update a specialist profile

```bash
# Using an accessToken from auth-service:
curl -i -X POST http://localhost:8080/specialists/profile \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"displayName":"Jane Doe","category":"hairdresser"}'
# Expected: 201, data.status == "draft"

curl -i http://localhost:8080/specialists/me -H "Authorization: Bearer <accessToken>"
# Expected: 200, data.displayName == "Jane Doe"

curl -i -X PATCH http://localhost:8080/specialists/me \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"status":"published"}'
# Expected: 200, data.status == "published"

curl -i http://localhost:8080/specialists/public
# Expected: 200, the profile now appears (status == published)

curl -i http://localhost:8080/specialists/me/status-history -H "Authorization: Bearer <accessToken>"
# Expected: 200, two entries: null->draft, draft->published
```

## 3. Get by id (optional auth affects visibility)

```bash
curl -i http://localhost:8080/specialists/<specialistProfileId>
# Expected: 200 if published; 404 if draft/suspended and no auth, or auth != owner
```

## 4. Sub-paths stay legacy

```bash
curl -i http://localhost:8080/specialists/me/company-requests
curl -i http://localhost:8080/specialists/me/companies
curl -i http://localhost:8080/specialists/me/services
curl -i http://localhost:8080/specialists/<specialistProfileId>/reviews
```

Expected: all served by legacy-backend, unaffected by this phase.

## 5. Event flow

```txt
[event check]
- specialists_schema.outbox_events has specialist.created then
  specialist.updated rows, both reaching status = published once
  outbox-publisher-specialists runs.
```

No consumers exist yet for `specialist.created`/`specialist.updated` — this is
expected until Phase 9 (appointments-service).

## Result

_Fill in after running the steps above._
