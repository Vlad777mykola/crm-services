# RabbitMQ Basics

## Current status

**CURRENT VERIFIED** — general RabbitMQ concepts. Local ports/credentials verified against `docker/dev/compose.infra.yml`.

---

## What is RabbitMQ?

RabbitMQ is a message broker. Producers send messages to **exchanges**; exchanges route messages to **queues** based on **bindings** and **routing keys**; consumers read from queues.

This repository uses RabbitMQ for **asynchronous domain events** between microservices.

---

## Core concepts

| Concept | In this repo |
| ------- | ------------ |
| Producer | `outbox-publisher` or `ai-service` (direct mode) |
| Consumer | Each service with a `rabbitmq/consumer` module |
| Exchange | `domain.events`, `analytics.events` (topic, durable) |
| Queue | `{service-name}.q` |
| Routing key | Usually equals event type, e.g. `auth.user_registered` |
| Vhost | `crm-dev` (local) |

---

## Topic exchanges

Type `topic` exchanges match routing keys with patterns:

- `auth.user_registered` — exact match
- `appointment.*` — one word wildcard
- `#` — zero or more words (used by metrics-service)

---

## Why not HTTP for everything?

HTTP requires the callee to be up when the caller needs a side effect. Events decouple services: the producer commits its fact; consumers react when ready.

---

## Local broker

```powershell
docker compose -f docker/dev/compose.infra.yml --profile events up -d rabbitmq
```

- AMQP: `localhost:5672`
- Management UI: http://localhost:15672
- Credentials: `crm` / `crm_local_only`
- Vhost: `crm-dev`

---

## What this repo does NOT teach

- Exactly-once delivery (we use at-least-once + idempotency)
- Kafka semantics (see [20-kafka-readiness.md](./20-kafka-readiness.md))

---

## Next

[03-repo-architecture.md](./03-repo-architecture.md) — how this repository uses RabbitMQ.
