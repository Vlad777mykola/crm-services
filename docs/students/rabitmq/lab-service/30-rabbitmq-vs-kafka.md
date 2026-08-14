# Lesson 30 — RabbitMQ vs Kafka

## Status

**CURRENT VERIFIED** (educational overview)

## 1. Goal

Understand why CRM uses RabbitMQ now, and how RFC2 makes the outbox broker-neutral.

## 2. What problem are we solving?

Students should not assume every system needs Kafka, or that RabbitMQ is always enough.

## 3. Mental model

```text
RabbitMQ Lab → real CRM services → RFC1 reliability → RFC2 broker-neutral delivery → Kafka optional
```

## 4. Diagram

```text
outbox_events (schema) → outbox-publisher → RabbitMQ today
                       → outbox_deliveries (RFC2) → RabbitMQ or Kafka later
```

## 5. RabbitMQ terminology

Queue-centric routing, competing consumers, at-least-once ACK model.

## 6. Existing code example

`services/rabbitmq-lab-service` writes only to `student.rabbitmq-lab.*` but **reads** `domain.events` — same read pattern real services use, different broker-agnostic outbox in RFC2.

## 7. Exercise

Read [docs/students/rabitmq/common/20-kafka-readiness.md](../common/20-kafka-readiness.md) and list three things RabbitMQ solves well in this CRM vs three things Kafka solves differently.

## 8. Start commands

None — reading exercise.

## 9. Publish action

N/A.

## 10. What you should observe

N/A.

## 11. RabbitMQ Management UI steps

N/A.

## 12. Logs you should see

N/A.

## 13. Expected queue state

N/A.

## 14. Failure exercise

N/A.

## 15. Cleanup/reset

N/A.

## 16. Questions

Why should domain services not know which broker delivers events?

## 17. How CRM uses this concept

Domain services write `outbox_events`; delivery mechanism is infrastructure (RabbitMQ today, optional Kafka per RFC2).

## 18. Production note

Choosing RabbitMQ vs Kafka is an infrastructure decision — not something to bake into `companies-service` business logic.

## Next

[GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md)
