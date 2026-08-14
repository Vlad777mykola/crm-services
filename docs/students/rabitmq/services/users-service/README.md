# users-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Owns user profiles (`users_schema`).

## Why it uses RabbitMQ

Creates a profile when `auth.user_registered` arrives — decoupled from auth registration HTTP response.

## Quick diagram

```text
domain.events/auth.user_registered → users-service.q → profile creation
```

## Publishes

None (outbox table exists but unused).

## Consumes

| Event | Queue | Binding |
| ----- | ----- | ------- |
| `auth.user_registered` | `users-service.q` | `domain.events` / `auth.user_registered` |

## Queue

`users-service.q`

## Outbox

Table `users_schema.outbox_events` exists — **not used** (no publish code).

## Idempotency

`users_schema.processed_events`, `consumer_name = 'users-service'`

## Code locations

- [`services/users-service/src/rabbitmq/topology.ts`](../../../../../services/users-service/src/rabbitmq/topology.ts)
- [`services/users-service/src/handlers/auth-user-registered.ts`](../../../../../services/users-service/src/handlers/auth-user-registered.ts)

## Guides

[LEARN.md](./LEARN.md) · [EVENTS.md](./EVENTS.md) · [DEVELOPER.md](./DEVELOPER.md) · [TESTING.md](./TESTING.md) · [OPERATIONS.md](./OPERATIONS.md)
