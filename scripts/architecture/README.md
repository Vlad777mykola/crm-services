# Architecture guardrails

Static checks that enforce messaging architecture invariants alongside documentation.

## Three layers

| Layer | Tool | What it catches |
| ----- | ---- | --------------- |
| 1 | ESLint (`eslint-plugin-crm` + `no-restricted-imports`) | `amqplib` / Kafka in domain code; ACK/NACK/publish in handlers |
| 2 | dependency-cruiser | Cross-service imports; domain → `rabbitmq/`; domain → `amqplib` |
| 3 | `check-messaging.mjs` | Contracts, outbox API shape, queue ownership, routing/catalog alignment |

ESLint and dependency-cruiser catch **wrong imports and dependencies**.  
`check-messaging.mjs` catches **messaging contract drift** ESLint cannot see.

Integration tests (`yarn test:messaging`) still prove runtime behavior: inbox TX order, publisher confirms, retries, reconnect.

## Commands

From repo root:

```bash
yarn lint:architecture
yarn check:messaging
yarn verify:architecture
```

`verify:architecture` runs:

1. ESLint architecture rules (root `eslint.config.mjs`)
2. dependency-cruiser (`.dependency-cruiser.cjs`)
3. `check-messaging.mjs`
4. `ci:validate-events`

## ESLint rules (`tools/eslint-plugin-crm`)

| Rule | Blocks |
| ---- | ------ |
| `crm/no-broker-control-in-handler` | `channel.ack()`, `nack()`, `reject()` in handlers/modules/http/consumer |
| `crm/no-direct-broker-publish` | `channel.publish()`, `sendToQueue()`, `import amqplib` in business layers |
| `no-restricted-imports` | `amqplib`, `kafkajs`, `@kafkajs/*`, `@confluentinc/*` in business layers |

Allowed broker code paths:

```text
services/*/src/rabbitmq/**
services/outbox-publisher/**
services/messaging-kit/**
services/event-delivery/**
```

## Progressive rollout (ARCH-1 … ARCH-6)

| Phase | Status | Scope |
| ----- | ------ | ----- |
| ARCH-1 | done | ESLint `no-restricted-imports` + custom CRM rules |
| ARCH-2 | done | dependency-cruiser forbidden dependency rules |
| ARCH-3 | done | `check-messaging.mjs` static contract checks |
| ARCH-4 | done | Custom ESLint plugin (`eslint-plugin-crm`) |
| ARCH-5 | existing | `yarn test:messaging` integration harness |
| ARCH-6 | planned | RFC2 gates (`no-transport-fields-in-domain-outbox`) |

## PR rule

If a PR changes event types, routing, queues, outbox, or consumers — it must pass `yarn verify:architecture`.

See also [docs/students/rabitmq/DOCUMENTATION-IMPLEMENTATION-PLAN.md](../../docs/students/rabitmq/DOCUMENTATION-IMPLEMENTATION-PLAN.md).
