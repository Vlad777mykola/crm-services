# users-service — Events Reference

## Published events

None.

## Consumed events

### auth.user_registered

| Field | Value |
| ----- | ----- |
| Event | `auth.user_registered` |
| Direction | consume |
| Queue | `users-service.q` |
| Binding | `domain.events` / `auth.user_registered` |
| Handler | `handlers/auth-user-registered.ts` |
| DB effect | Create user + profile |
| Idempotency | yes |
| Failure path | NACK → `users.dead.q` |
| Contract | [`auth.user_registered.v1.json`](../../../../../contracts/events/auth.user_registered.v1.json) |
