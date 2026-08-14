# RFC2 — Broker-Neutral Delivery

## Current status

**TARGET RFC2 — NOT IMPLEMENTED** as default runtime.

Skeleton exists: `services/event-delivery/`.

---

## Problem RFC2 solves

Today, outbox rows store `exchange` and `routingKey` — RabbitMQ-specific. RFC2 decouples domain producers from transport details.

---

## Target flow

```text
domain service
  ↓
broker-neutral outbox_event (eventType only)
  ↓
delivery initializer
  ↓
outbox_deliveries (per sink)
  ↓
EventSink
  ↓
RabbitMqSink (today) / KafkaSink (future)
```

---

## EventSink (not GenericMessageBus)

**RULE 14:** Do not pretend RabbitMQ and Kafka have identical semantics.

`EventSink` interface (`services/event-delivery/src/sinks/event-sink.ts`) keeps transport-specific behavior in sink implementations.

---

## RabbitMqSink routes (skeleton)

From `services/event-delivery/src/sinks/rabbitmq-sink.ts`:

| Logical type | Exchange | Routing key |
| ------------ | -------- | ----------- |
| `domain.appointment.created` | `domain.events` | `appointment.created` |
| `domain.auth.user_registered` | `domain.events` | `auth.user_registered` |
| `analytics.ai.appointment_recommendation_created` | `analytics.events` | `ai.appointment_recommendation_created` |

---

## SQL

`services/event-delivery/sql/rfc2-outbox.sql` — `outbox_events`, `outbox_deliveries`

---

## Cutover

See [rfc2-cutover.md](../../../architecture/rfc2-cutover.md) — dev/test purge procedure; production uses controlled migrations.

---

## What exists today

`event-delivery` main loop polls pending delivery count but **does not claim or deliver**. Legacy `outbox-publisher` remains the runtime path.

---

## Next

[20-kafka-readiness.md](./20-kafka-readiness.md)
