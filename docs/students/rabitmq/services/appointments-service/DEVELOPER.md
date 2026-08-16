# appointments-service — Developer Guide

Topology: `src/rabbitmq/topology.ts`. Projections: `handlers/projection-events.ts`. Outbox: `src/outbox/outbox-repository.ts`.

Publisher: `outbox-publisher-appointments`.

## Consumer lifecycle

Largest binding set; retry topology on `domain.events` and `analytics.events`. Standard `connectManaged` + `handleConsumerFailure` pattern.

[common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md)

When adding projection consumer: binding + projection table + idempotency + test.
