# auth-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Owns authentication identities, sessions, and membership projection used for authorization.

## Why it uses RabbitMQ

- **Publishes** `auth.user_registered` so `users-service` can create a profile without synchronous coupling.
- **Consumes** membership events to maintain `auth_membership_projection` for JWT claims.

## Quick diagram

```text
HTTP register → outbox → domain.events/auth.user_registered → users-service

company-members → domain.events/company-member.* → auth-service.q → projection
```

## Publishes

| Event | Exchange | Routing key | Outbox |
| ----- | -------- | ----------- | ------ |
| `auth.user_registered` | `domain.events` | `auth.user_registered` | yes |

## Consumes

| Event | Queue | Binding |
| ----- | ----- | ------- |
| `company-member.added` | `auth-service.q` | `domain.events` / `company-member.added` |
| `company-member.removed` | `auth-service.q` | `domain.events` / `company-member.removed` |

## Queue

`auth-service.q` (DLX: `domain.events.dlx`)

## Exchanges

`domain.events`, `analytics.events`, `commands`, DLX pair

## Outbox

Yes — `auth_schema.outbox_events`. Published by `outbox-publisher-auth`.

## Idempotency

`auth_schema.processed_events`, `consumer_name = 'auth-service'`

## Important code locations

- [`services/auth-service/src/rabbitmq/topology.ts`](../../../../../services/auth-service/src/rabbitmq/topology.ts)
- [`services/auth-service/src/rabbitmq/consumer.ts`](../../../../../services/auth-service/src/rabbitmq/consumer.ts)
- [`services/auth-service/src/outbox/outbox-repository.ts`](../../../../../services/auth-service/src/outbox/outbox-repository.ts)
- [`services/auth-service/src/handlers/company-member-events.ts`](../../../../../services/auth-service/src/handlers/company-member-events.ts)

## Guides

[LEARN.md](./LEARN.md) · [EVENTS.md](./EVENTS.md) · [DEVELOPER.md](./DEVELOPER.md) · [TESTING.md](./TESTING.md) · [OPERATIONS.md](./OPERATIONS.md)
