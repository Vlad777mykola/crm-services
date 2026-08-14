# appointments-service — Developer Guide

Topology: `src/rabbitmq/topology.ts`. Projections: `handlers/projection-events.ts`. Outbox: `src/outbox/outbox-repository.ts`.

Publisher: `outbox-publisher-appointments`.

When adding projection consumer: binding + projection table + idempotency + test.
