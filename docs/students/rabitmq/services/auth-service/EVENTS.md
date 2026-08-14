# auth-service — Events Reference

## Status

**CURRENT VERIFIED**

## Published events

### auth.user_registered

| Field | Value |
| ----- | ----- |
| Event | `auth.user_registered` |
| Direction | publish |
| Exchange | `domain.events` |
| Routing key | `auth.user_registered` |
| Contract | [`auth.user_registered.v1.json`](../../../../../contracts/events/auth.user_registered.v1.json) |
| Created by | Registration flow via `outbox-repository.ts` |
| Outbox | yes — `auth_schema.outbox_events` |
| Consumers | users-service |

## Consumed events

### company-member.added

| Field | Value |
| ----- | ----- |
| Event | `company-member.added` |
| Direction | consume |
| Queue | `auth-service.q` |
| Binding | `domain.events` / `company-member.added` |
| Handler | `handlers/company-member-events.ts` |
| DB effect | Upsert `auth_membership_projection` |
| Idempotency | yes |
| Failure path | NACK → `auth.dead.q` |

### company-member.removed

| Field | Value |
| ----- | ----- |
| Event | `company-member.removed` |
| Direction | consume |
| Queue | `auth-service.q` |
| Binding | `domain.events` / `company-member.removed` |
| Handler | `handlers/company-member-events.ts` |
| DB effect | Remove/update membership projection |
| Idempotency | yes |
| Failure path | NACK → `auth.dead.q` |
