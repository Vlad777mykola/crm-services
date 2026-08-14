# users-service — Testing Guide

| Scenario | Expected result |
| -------- | --------------- |
| Valid `auth.user_registered` | Profile created, ACK |
| Duplicate same `event_id` | No second profile, ACK |
| Handler failure | Rollback, NACK → `users.dead.q` |

**PRECONDITIONS:** users-service + RabbitMQ + prior auth registration or manual publish.

**ACTION:** Deliver envelope to `domain.events` / `auth.user_registered`.

**EXPECTED DB:** `users` + `user_profiles` row; `processed_events` row.

**EXPECTED BROKER:** Queue empty after ACK.

Run: `yarn test` from `services/users-service/`.
