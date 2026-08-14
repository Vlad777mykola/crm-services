# metrics-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Observational metrics — counts events by type and exchange. **Not** a business consumer.

## Consumes

All messages on `domain.events` (`#`) and `analytics.events` (`#`)

## Publishes

None.

## Queue

`metrics-service.q` — **no DLX**

## State

In-memory only (`src/metrics/store.ts`). No `processed_events`. Failed messages NACK'd without requeue.

## Delivery semantics

At-least-once observational metrics — duplicates increment counters.

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)

See also [`services/metrics-service/MESSAGING.md`](../../../../../services/metrics-service/MESSAGING.md).
