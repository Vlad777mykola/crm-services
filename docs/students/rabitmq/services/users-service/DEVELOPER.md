# users-service — Developer Guide

## Code map

| Area | Path |
| ---- | ---- |
| Topology | `src/rabbitmq/topology.ts` |
| Consumer | `src/rabbitmq/consumer.ts` |
| Processing | `src/consumer/process-inbound-event.ts` |
| Handler | `src/handlers/auth-user-registered.ts` |
| Idempotency | `src/idempotency/processed-events-repository.ts` |

Consumer-only service. Reference implementation for `connectManaged` + retry topology.

## Consumer lifecycle

- `connectManaged({ setup })` — TCP reconnect + `isReady()`
- `channel.once('close')` → `lifecycle.invalidate()`
- Failure → `handleConsumerFailure()` → tiers → parking → ACK original

[common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md) · tests: `src/rabbitmq/consumer.test.ts`

## Adding a consumed event

Binding + handler + tests + EVENTS.md.
