# users-service — Developer Guide

## Code map

| Area | Path |
| ---- | ---- |
| Topology | `src/rabbitmq/topology.ts` |
| Consumer | `src/rabbitmq/consumer.ts` |
| Processing | `src/consumer/process-inbound-event.ts` |
| Handler | `src/handlers/auth-user-registered.ts` |
| Idempotency | `src/idempotency/processed-events-repository.ts` |

Consumer-only service. To add a new consumed event: binding + handler + tests + EVENTS.md.
