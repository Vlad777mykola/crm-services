# Smoke Checklist — Phase 9 (appointments-service)

Manual verification only. All 7 confirmed appointment routes now route to
`appointments-service`; `/appointments/:id/review`, `/companies/:id/reviews`,
`/services/:id/reviews`, `/specialists/:id/reviews`, and `/companies/:id/summary`
stay legacy (Phase 10 / Phase 15).

## 1. Start the stack

Add `--profile appointments` (see `docker/dev/README.md`) alongside the usual
`events`/`auth`/`companies`/`company-members`/`specialists`/`company-specialists`/
`services-catalog` profiles, or run `cd services/appointments-service && yarn dev`
+ the `outbox-publisher-appointments` instance on the host.

You'll need, from earlier phases: a company (owner token), an active
company-specialist (Phase 7), and a **published** service with that
specialist assigned (Phase 8) — plus a second user to act as the client.

## 2. Projections warm up from events

Before creating an appointment, confirm the company/service/specialist-service
events already reached this service (published while it was running, or
replay by re-triggering the writes):

```txt
[event check]
- appointments_schema.appointment_company_projection has a row for <companyId>.
- appointments_schema.appointment_service_projection has a row for <serviceId>
  with status = "published".
- appointments_schema.appointment_service_specialist_projection has a row for
  (<serviceId>, <specialistProfileId>).
- appointments_schema.appointment_membership_projection has a row for
  (<companyId>, <ownerUserId>) with role = "owner".
```

If any is missing, the create/list/respond calls below will 404/403
correctly (that's the projection doing its job), but you won't see the happy
path — go back and re-run the Phase 4/5/7/8 write that emits the missing
event.

## 3. Request / list / approve / complete

```bash
curl -i -X POST http://localhost:8080/companies/<companyId>/appointments \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"serviceId":"<serviceId>","specialistProfileId":"<specialistProfileId>","requestedStartAt":"2026-09-01T10:00:00.000Z","notes":"first visit"}'
# Expected: 201, data.status == "pending"

curl -i http://localhost:8080/companies/<companyId>/appointments -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, includes the pending appointment

curl -i -X PATCH http://localhost:8080/companies/<companyId>/appointments/<appointmentId> \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
# Expected: 200, data.status == "approved"

curl -i -X POST http://localhost:8080/companies/<companyId>/appointments/<appointmentId>/complete \
  -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, data.status == "completed"

curl -i http://localhost:8080/appointments/me -H "Authorization: Bearer <clientAccessToken>"
# Expected: 200, includes this appointment with hasReview == false (known gap, see README)

curl -i http://localhost:8080/appointments/<appointmentId>/status-history -H "Authorization: Bearer <clientAccessToken>"
# Expected: 200, entries: null->pending, pending->approved, approved->completed
```

## 4. Reject / cancel paths

```bash
# New pending appointment, then reject it:
curl -i -X PATCH http://localhost:8080/companies/<companyId>/appointments/<otherAppointmentId> \
  -H "Authorization: Bearer <ownerAccessToken>" -H "Content-Type: application/json" \
  -d '{"status":"rejected"}'
# Expected: 200, data.status == "rejected"; re-PATCH -> 409 (no transition from rejected)

# Another new pending appointment, then the client cancels it themselves:
curl -i -X POST http://localhost:8080/appointments/<thirdAppointmentId>/cancel \
  -H "Authorization: Bearer <clientAccessToken>"
# Expected: 200, data.status == "cancelled"
```

## 5. Permission checks

```bash
curl -i http://localhost:8080/companies/<companyId>/appointments -H "Authorization: Bearer <someoneElsesAccessToken>"
# Expected: 403 (not an owner/manager of this company)

curl -i -X POST http://localhost:8080/companies/<companyId>/appointments \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"serviceId":"<draftServiceId>","requestedStartAt":"2026-09-01T10:00:00.000Z"}'
# Expected: 404 (service not published, or projection doesn't have it yet)

curl -i -X POST http://localhost:8080/companies/<companyId>/appointments \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" \
  -d '{"serviceId":"<serviceId>","specialistProfileId":"<unassignedSpecialistProfileId>","requestedStartAt":"2026-09-01T10:00:00.000Z"}'
# Expected: 409 (preferred specialist not assigned to this service)
```

## 6. Sub-paths stay legacy

```bash
curl -i -X POST http://localhost:8080/appointments/<appointmentId>/review \
  -H "Authorization: Bearer <clientAccessToken>" -H "Content-Type: application/json" -d '{"rating":5}'
curl -i http://localhost:8080/companies/<companyId>/reviews
curl -i http://localhost:8080/companies/<companyId>/summary
```

Expected: served by legacy-backend, unaffected by this phase.

## 7. Event flow

```txt
[event check]
- appointments_schema.outbox_events has appointment.requested, .approved,
  .rejected, .completed, and .cancelled rows, all reaching status =
  published once outbox-publisher-appointments runs.
- No new consumers exist for these yet — ai-service still consumes the
  legacy-backend copies until Phase 14 rewires it.
```

## Result

_Fill in after running the steps above._
