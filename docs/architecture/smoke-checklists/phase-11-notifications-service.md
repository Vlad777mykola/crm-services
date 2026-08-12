# Smoke Checklist — Phase 11 (notifications-service HTTP API)

Manual verification only. All 4 confirmed notification routes now route to
`notifications-service`, which already ran as a RabbitMQ consumer before this
phase.

## 1. Start the stack

Start `notifications-service` as usual (`cd services/notifications-service && yarn dev`,
or the `node-workers` Docker profile per `docker/dev/README.md`). Confirm
`services/notifications-service/.env`'s `JWT_ACCESS_SECRET` matches
auth-service's, and `backend/.env`'s `IN_PROCESS_NOTIFICATIONS_ENABLED=false`.

## 2. Trigger a notification via an existing event flow

Complete an appointment (Phase 9) or leave a review (Phase 10) as a
prerequisite - either creates a notification for the company's
owner/manager (appointment events) or nothing user-facing yet for reviews
(no review notification wiring exists). Easiest: request/approve/reject/
complete/cancel an appointment as in the Phase 9 checklist, then check as
the owner:

```bash
curl -i http://localhost:8080/notifications/me -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, includes a notification for the appointment event

curl -i http://localhost:8080/notifications/me/unread-count -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, data.count >= 1

curl -i -X POST http://localhost:8080/notifications/me/<notificationId>/read -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, data.isRead == true

curl -i -X POST http://localhost:8080/notifications/me/read-all -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, every notification in data has isRead == true

curl -i http://localhost:8080/notifications/me/unread-count -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 200, data.count == 0
```

## 3. No duplicate notifications

```txt
[check]
- Only one notification per appointment event exists in
  notifications_schema.notifications (confirms IN_PROCESS_NOTIFICATIONS_ENABLED=false
  actually stopped legacy's in-process subscriber from also creating one).
```

## 4. Permission checks

```bash
curl -i http://localhost:8080/notifications/me
# Expected: 401 (no token)

curl -i -X POST http://localhost:8080/notifications/me/<someoneElsesNotificationId>/read -H "Authorization: Bearer <ownerAccessToken>"
# Expected: 404 (not this user's notification)
```

## Result

_Fill in after running the steps above._
