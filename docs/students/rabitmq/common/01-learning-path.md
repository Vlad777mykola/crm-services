# Learning Path

## Current status

**CURRENT VERIFIED** — curriculum structure. RFC1/Kafka levels marked separately.

Recommended order for students learning RabbitMQ in this repository.

---

## Level 1 — RabbitMQ basics

**What to understand first:** What a message broker is; producer, consumer, queue.

**Read:** [02-rabbitmq-basics.md](./02-rabbitmq-basics.md)

**Inspect:** RabbitMQ Management UI (http://localhost:15672) after starting infra.

**Exercise:** Log into management UI; find the `crm-dev` vhost.

**Afterward you can explain:** Why services don't call each other synchronously for every side effect.

---

## Level 2 — Exchanges, queues, bindings, routing keys

**Read:** [02-rabbitmq-basics.md](./02-rabbitmq-basics.md), [07-routing-topology.md](./07-routing-topology.md)

**Inspect:** `services/users-service/src/rabbitmq/topology.ts`

**Exercise:** Find how `users-service.q` binds to `domain.events`.

**Afterward:** Draw exchange → queue → consumer for one event.

---

## Level 3 — Events in this repository

**Read:** [04-event-contracts.md](./04-event-contracts.md), [GLOSSARY.md](../GLOSSARY.md)

**Inspect:** `contracts/events/envelope.v1.json`, `contracts/events/auth.user_registered.v1.json`

**Exercise:** List the required envelope fields.

---

## Level 4 — Publishing with transactional outbox

**Read:** [05-publishing-and-outbox.md](./05-publishing-and-outbox.md)

**Inspect:** `services/auth-service/src/outbox/outbox-repository.ts`, `services/outbox-publisher/`

**Exercise:** Trace `auth.user_registered` from HTTP handler to outbox row.

**Service trace:** [auth-service LEARN](../services/auth-service/LEARN.md)

---

## Level 5 — Consuming events

**Read:** [06-consuming-and-idempotency.md](./06-consuming-and-idempotency.md)

**Inspect:** `services/users-service/src/consumer/process-inbound-event.ts`

**Exercise:** Follow `auth.user_registered` from queue to profile creation.

**Service trace:** [users-service LEARN](../services/users-service/LEARN.md)

---

## Level 6 — Idempotency

**Read:** [06-consuming-and-idempotency.md](./06-consuming-and-idempotency.md)

**Inspect:** `services/users-service/src/idempotency/processed-events-repository.ts`

**Exercise:** Explain what happens when the same `event_id` is delivered twice.

---

## Level 7 — ACK / NACK / failures

**Read:** [06-consuming-and-idempotency.md](./06-consuming-and-idempotency.md), [11-debugging.md](./11-debugging.md)

**Inspect:** `services/users-service/src/rabbitmq/consumer.ts`

**Exercise:** Find where ACK happens relative to DB commit.

---

## Level 8 — Retries / DLQ / parking

**CURRENT:** dead-letter queues.

**TARGET RFC1:** retry tiers + parking — [08-retries-dlq-parking.md](./08-retries-dlq-parking.md)

**Inspect:** `services/messaging-kit/src/retry.ts`

---

## Level 9 — Real service tracing

**Read:** [SERVICES.md](../SERVICES.md)

**Traces:**

- Example A: registration (auth → users)
- Example B: `appointment.requested` (appointments → notifications, ai, metrics)
- Example C: AI result (ai → analytics.events → appointments, notifications)

---

## Level 10 — Testing

**Read:** [10-testing.md](./10-testing.md)

**Inspect:** `services/notifications-service/src/rabbitmq/consumer.test.ts`

---

## Level 11 — Operating RabbitMQ locally

**Read:** [09-local-development.md](./09-local-development.md), [12-operations.md](./12-operations.md)

---

## Level 12 — Production concepts

**Read:** [13-production-rules.md](./13-production-rules.md)

---

## Level 13 — Broker-neutral delivery

**TARGET RFC2** — [19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md)

---

## Level 14 — Kafka comparison / readiness

**FUTURE KAFKA** — [20-kafka-readiness.md](./20-kafka-readiness.md)

---

## Level 15 — Architecture guardrails

**CURRENT VERIFIED** — [21-architecture-guardrails.md](./21-architecture-guardrails.md)

Run `yarn verify:architecture` before opening a messaging PR.
