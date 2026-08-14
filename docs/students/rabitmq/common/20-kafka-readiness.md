# Kafka Readiness

## FUTURE / OPTIONAL

**Kafka is NOT currently required to run this repository.**

**Kafka is NOT part of the current default messaging runtime.**

The architecture is being prepared so Kafka may be added later via RFC2 `EventSink` — not a universal MessageBus.

---

## Current runtime

RabbitMQ only: `domain.events`, `analytics.events`, outbox-publisher, service consumers.

---

## Likely split (strategy, not absolute law)

| RabbitMQ | Kafka (future) |
| -------- | -------------- |
| Commands, jobs | Durable facts |
| Operational work | Replay, analytics |
| Short retries | Projections, integration streams |

---

## Rules

- **RULE 13:** No Kafka concepts in domain/business code
- **RULE 14:** No GenericMessageBus hiding broker semantics
- Kafka enters via `KafkaSink` implementing `EventSink` (**TARGET RFC2**)

---

## Roadmap doc

[kafka-roadmap.md](../../../architecture/kafka-roadmap.md) — supporting context only; code is truth.

---

## For students

Learn RabbitMQ and this repo's outbox/consumer model first. Kafka comparison is Level 14 in [01-learning-path.md](./01-learning-path.md).

---

## Back to current docs

[README.md](../README.md)
