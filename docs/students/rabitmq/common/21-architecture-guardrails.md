# Architecture Guardrails

## Current status

**CURRENT VERIFIED** — ARCH-1 through ARCH-4 implemented. ARCH-6 is **TARGET RFC2**.

---

## Why linting exists

RabbitMQ invariants (outbox-only publish, handler-owned business logic, consumer-owned ACK) must not live only in docs. Incorrect architecture should **fail in the editor and CI**.

ESLint cannot prove `BEGIN → processed_events → handler → COMMIT → ACK` at runtime. That requires `yarn test:messaging`.

---

## Three enforcement layers

```text
Layer 1 — ESLint
  no amqplib in handlers/modules
  no channel.ack() in business code
  no direct publish in domain

Layer 2 — dependency-cruiser
  no cross-service src imports
  no modules → rabbitmq/

Layer 3 — check-messaging.mjs
  contracts ↔ outbox routing
  queue ownership
  recordOutboxEvent(client, …) API shape
  markProcessed(client, …) API shape
```

---

## Commands

From repo root:

```powershell
yarn lint:architecture
yarn check:messaging
yarn verify:architecture
```

`verify:architecture` = lint + dependency-cruiser + check-messaging + ci:validate-events.

---

## Tool locations

| Tool | Path |
| ---- | ---- |
| Root ESLint | `eslint.config.mjs` |
| Shared architecture config | `tools/eslint-config-crm/architecture.mjs` |
| Custom plugin | `tools/eslint-plugin-crm/` |
| Dependency rules | `.dependency-cruiser.cjs` |
| Messaging checker | `scripts/architecture/check-messaging.mjs` |
| Docs | `scripts/architecture/README.md` |

---

## Permitted dependency direction

```text
DOMAIN / APPLICATION (handlers, modules)
        │
        ▼
outbox repository / consumer process-inbound
        │
        ▼
INFRASTRUCTURE (rabbitmq/, outbox-publisher)
        │
        ▼
RabbitMQ broker
```

`@crm/messaging-kit` `connectManaged()` lives in the infrastructure layer for Node consumers (TCP reconnect + readiness). Channel topology, consume, and ACK/retry stay in each `rabbitmq/consumer.ts`. See [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## What linting cannot prove

- Inbox transaction ordering at runtime
- Publisher confirms accepted by broker
- Retry tier progression timing
- Reconnect after broker outage (`connectManaged` + `invalidate()` — see [rabitmq/common/22-connection-lifecycle.md](../rabitmq/common/22-connection-lifecycle.md))

Use integration tests and local verification for those.

---

## TARGET RFC2 (ARCH-6)

After broker-neutral cutover, enable:

- `crm-messaging/no-transport-fields-in-domain-outbox` — domain outbox must not store `exchange`/`routingKey`
- Kafka import restrictions outside `event-delivery` sinks

---

## Next

[13-production-rules.md](./13-production-rules.md)
