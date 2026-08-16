# Repository Messaging Architecture

## Current status

**CURRENT VERIFIED**

---

## How this repository uses RabbitMQ

1. **Domain services** write business data + `outbox_events` in one DB transaction.
2. **`outbox-publisher`** (per schema) polls and publishes to RabbitMQ.
3. **Consumers** read from dedicated queues, deduplicate via `processed_events`, process in a DB transaction, then ACK.
4. **`connectManaged`** (`@crm/messaging-kit`) owns TCP reconnect + readiness; each service owns channel/topology/consume/ACK/retry.
5. **`ai-service`** can publish analytics results directly or via outbox (`MESSAGING_MODE`).
6. **`metrics-service`** observes all traffic on both exchanges (in-memory counters).

---

## Service categories

| Category | Services | RabbitMQ role |
| -------- | -------- | ------------- |
| Publish + consume | auth, companies, company-members, appointments | Outbox + queue |
| Consume only | users, notifications | Queue only |
| Publish only (outbox) | specialists, company-specialists, services-catalog, reviews | Outbox; no consumer process |
| Direct publisher | ai-service | Publishes to `analytics.events` |
| Observer | metrics-service | `#` bindings, no side effects |
| Infrastructure | outbox-publisher | Polls DB, publishes |
| No messaging | dashboard-service | HTTP only |
| Student lab | rabbitmq-lab-service | Isolated namespace; own lifecycle copy |

Full matrix: [SERVICES.md](../SERVICES.md)

---

## Schema ownership

Each service owns a Postgres schema with its tables, including `outbox_events` and `processed_events` where applicable. See `services/*/src/db/schema.ts`.

---

## Shared library (`@crm/messaging-kit`)

`services/messaging-kit/` provides:

| Module | Purpose |
| ------ | ------- |
| `connectManaged()` | TCP lifecycle, `setup()`, `invalidate()`, `isReady()` / `isConnected()` |
| `declareRetryTopology()` | Retry tier + parking queues |
| `handleConsumerFailure()` | Tier progression + parking republish |
| Correlation helpers | `resolveCorrelationId`, error taxonomy |

Services still declare **base** topology independently (no shared topology package import for deployability).

Connection lifecycle details: [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Architecture docs (supporting context)

- [event-driven-model.md](../../../architecture/event-driven-model.md)
- [event-catalog.md](../../../architecture/event-catalog.md)
- [target-production-architecture.md](../../../architecture/target-production-architecture.md)

Code overrides docs when they disagree.

---

## RFC1 / RFC2 / Kafka

| Phase | Doc |
| ----- | --- |
| Reliable RabbitMQ target | [18-rfc1-target.md](./18-rfc1-target.md) |
| Broker-neutral delivery | [19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md) |
| Optional Kafka | [20-kafka-readiness.md](./20-kafka-readiness.md) |

---

## Next

[04-event-contracts.md](./04-event-contracts.md)
