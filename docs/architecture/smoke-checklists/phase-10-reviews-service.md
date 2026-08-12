# Smoke Checklist — Phase 10 (reviews-service)

Manual verification only. All 4 confirmed review routes now route to
`reviews-service`; `/companies/:id/summary` stays legacy (Phase 15).

## 1. Start the stack

Add `--profile reviews` (see `docker/dev/README.md`) alongside the usual
`events`/`auth`/`companies`/`company-members`/`specialists`/
`company-specialists`/`services-catalog`/`appointments` profiles, or run
`cd services/reviews-service && yarn dev` + the `outbox-publisher-reviews`
instance on the host.

You'll need a **completed** appointment from Phase 9 (owner/client/specialist
already set up).

## 2. Create / list a review

```bash
curl -i -X POST http://localhost:8080/appointments/<appointmentId>/review \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Great service"}'
# Expected: 201, data.rating == 5, data.specialistProfileId set if the
# appointment had one

curl -i -X POST http://localhost:8080/appointments/<appointmentId>/review \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"rating":4}'
# Expected: 409 (already reviewed)

curl -i http://localhost:8080/companies/<companyId>/reviews
# Expected: 200, includes the review (public, no auth)

curl -i http://localhost:8080/services/<serviceId>/reviews
# Expected: 200, includes the review (public, no auth)

curl -i http://localhost:8080/specialists/<specialistProfileId>/reviews
# Expected: 200, includes the review if the appointment had a specialist assigned
```

## 3. Permission / validity checks

```bash
curl -i -X POST http://localhost:8080/appointments/<pendingAppointmentId>/review \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"rating":5}'
# Expected: 409 (only completed appointments can be reviewed)

curl -i -X POST http://localhost:8080/appointments/<someoneElsesAppointmentId>/review \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"rating":5}'
# Expected: 404 (not this client's appointment)
```

## 4. Sub-path stays legacy

```bash
curl -i http://localhost:8080/companies/<companyId>/summary
```

Expected: served by legacy-backend, unaffected by this phase.

## 5. Event flow

```txt
[event check]
- reviews_schema.outbox_events has a review.received row, reaching
  status = published once outbox-publisher-reviews runs.
- ai-service still consumes legacy-backend's copy until Phase 14 rewires it.
```

## Result

_Fill in after running the steps above._
