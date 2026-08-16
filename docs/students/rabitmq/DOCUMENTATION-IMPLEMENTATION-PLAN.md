# RabbitMQ Documentation Implementation Plan

## AI EXECUTION CONTRACT

You are implementing repository documentation for RabbitMQ.

Do not redesign messaging architecture.

Do not implement runtime messaging code unless explicitly requested.

Before documenting a service:

1. inspect its actual messaging implementation;
2. inspect relevant event contracts;
3. inspect topology/bindings;
4. inspect tests;
5. inspect outbox/idempotency behavior.

Use code as source of truth.

Every factual statement about CURRENT behavior must be verified from code.

Clearly label:

- **CURRENT VERIFIED**
- **TARGET RFC1**
- **TARGET RFC2**
- **FUTURE KAFKA**

Never describe a target as already implemented.

For each service create:

- `README.md`
- `LEARN.md`
- `EVENTS.md`
- `DEVELOPER.md`
- `TESTING.md`
- `OPERATIONS.md`

Use relative repository links.

Use real repository events for examples.

Every test example must contain:

- setup,
- action,
- expected result,
- expected DB state,
- expected broker state,
- cleanup.

Do not invent test commands. Inspect `package.json` / `pyproject.toml` first.

Do not mark a documentation task complete while TODO placeholders, broken links, unverified commands, or unverified event names remain.

Keep the master RabbitMQ README understandable for a new student, while service developer pages may assume normal engineering knowledge.

Documentation changes must remain consistent with the frozen RabbitMQ-first → broker-neutral → optional Kafka architecture.

---

## Non-negotiable rules

**RULE 1** — Code is the primary source of truth.

**RULE 2** — `contracts/events` is the event-contract source of truth.

**RULE 3** — Existing architecture documentation is supporting context.

**RULE 4** — Never describe planned RFC1/RFC2 behavior as if it currently exists.

**RULE 5** — Every page must distinguish: CURRENT VERIFIED, TARGET RFC1, TARGET RFC2, FUTURE KAFKA.

**RULE 6** — Never invent queues, exchanges, events, environment variables, ports, retry policies, commands, or test commands.

**RULE 7** — Verify file paths against the repository before documenting them.

**RULE 8** — Student documentation explains WHY and HOW.

**RULE 9** — Developer documentation explains WHERE, WHAT TO CHANGE, WHAT NOT TO CHANGE, and HOW TO VERIFY IT.

**RULE 10** — Testing documentation must include expected result, not only command examples.

**RULE 11** — A messaging code change is incomplete until its documentation is updated.

**RULE 12** — Do not teach "exactly once". The model is at-least-once delivery + idempotent effects.

**RULE 13** — Do not introduce Kafka concepts into domain/business code.

**RULE 14** — Do not use a universal MessageBus abstraction to pretend RabbitMQ and Kafka have identical semantics.

**RULE 15** — Examples must come from actual repository services/events whenever possible.

---

## Goal

Create one documentation system that serves two different audiences:

**STUDENTS**

- learn RabbitMQ
- understand why this repo uses it
- understand events/outbox/consumers/retries
- trace real examples through the code
- safely experiment locally

**DEVELOPERS**

- know where messaging code lives
- know how to add an event
- know how to add a consumer
- know how to change topology
- know how to test changes
- know how to inspect failures
- know how to operate it in dev
- know production rules
- know Kafka-readiness rules

There must be:

1. one master document
2. common topic documents
3. one documentation folder for every service
4. standard templates
5. documentation verification rules

---

## Target directory structure

```text
docs/students/rabitmq/
├── README.md
├── DOCUMENTATION-IMPLEMENTATION-PLAN.md
├── GLOSSARY.md
├── SERVICES.md
├── common/
│   ├── 01-learning-path.md … 20-kafka-readiness.md
├── services/
│   └── <service-name>/
│       ├── README.md, LEARN.md, EVENTS.md, DEVELOPER.md, TESTING.md, OPERATIONS.md
└── _templates/
    └── *.template.md
```

Every service folder must contain all six files, even when the service has no RabbitMQ consumer.

---

## Step-by-step implementation

### Step 1 — Documentation rules (this file)

Create `DOCUMENTATION-IMPLEMENTATION-PLAN.md` with the rules above.

### Step 2 — Audit the repository

Inspect each service's `package.json`, entry point, env, `rabbitmq/`, consumer, publisher, topology, handlers, outbox, idempotency, schema, health, tests, and Docker definitions.

Also inspect:

- `contracts/events/`
- `docs/architecture/event-driven-model.md`
- `docs/architecture/event-catalog.md`
- `services/outbox-publisher/`
- `docker/dev/compose.infra.yml`
- RabbitMQ env configuration

Output: `SERVICES.md`

### Step 3 — Verified messaging inventory

`SERVICES.md` must answer for every service: Publishes, Consumes, Outbox, Queue, Exchanges, DB, Notes. Every row verified from code. No inferred events.

### Step 4 — Master README.md

Single complete overview. See [README.md](./README.md) section list.

### Step 5 — Status labels everywhere

Every document uses consistent status blocks:

```markdown
## Current status

**CURRENT VERIFIED**

This section describes code that exists in the repository today.
```

```markdown
## RFC1 target

**TARGET — NOT IMPLEMENTED YET**

This behavior is part of the approved RFC1 messaging plan.
```

```markdown
## Kafka

**FUTURE / OPTIONAL**

Kafka is not currently part of this repository's runtime messaging stack.
```

### Steps 6–25 — Common guides, service folders, templates

See individual files under `common/`, `services/`, and `_templates/`.

### Step 26 — Service documentation completion criteria

A service folder is complete only when:

- all six files exist
- every documented event exists in code/contracts
- every event direction is correct
- all file links resolve
- queue/exchange/routing key names match code
- current vs target labels exist
- at least one real flow, duplicate, and failure example exist
- testing instructions contain expected results
- no TODO placeholders remain

### Step 27 — Repository-wide completion criteria

- all services represented
- master README complete
- service matrix complete
- student learning path complete
- developer workflows complete
- testing curriculum complete
- production guidance complete
- RFC1/RFC2/Kafka-readiness documented
- all links valid, commands verified, event names checked

### Step 28 — Documentation evolves with code

If a PR changes event type, payload, queue, exchange, binding, outbox, consumer, retry, DLQ, RabbitMQ config, messaging env vars, health dependency, or Kafka sink/policy — the same PR must update relevant common guide, producer/consumer `EVENTS.md`, and `TESTING.md` when behavior changes.

### Step 29 — Small documentation tasks

Execute in order; do not attempt everything in one pass:

| Task | Description | Status |
|------|-------------|--------|
| DOC-01 | Audit messaging code → `SERVICES.md` | done |
| DOC-02 | Create folder/template structure | done |
| DOC-03 | Write master README current architecture | done |
| DOC-04 | Write RabbitMQ basics | done |
| DOC-05 | Write outbox guide | done |
| DOC-06 | Write consumer/idempotency guide | done |
| DOC-07 | Write testing guide | done |
| DOC-08 | Document auth-service | done |
| DOC-09 | Document users-service | done |
| DOC-10 | Document companies-service | done |
| DOC-11 | Document company-members-service | done |
| DOC-12 | Document specialists-service | done |
| DOC-13 | Document company-specialists-service | done |
| DOC-14 | Document services-catalog-service | done |
| DOC-15 | Document appointments-service | done |
| DOC-16 | Document reviews-service | done |
| DOC-17 | Document dashboard-service | done |
| DOC-18 | Document notifications-service | done |
| DOC-19 | Document ai-service | done |
| DOC-20 | Document metrics-service | done |
| DOC-21 | Document outbox-publisher | done |
| DOC-22 | Document RFC1 target | done |
| DOC-23 | Document RFC2 broker-neutral | done |
| DOC-24 | Document Kafka readiness | done |
| DOC-final | Validate cross-links and event inventories | pending |

---

## Architecture Guardrails (ARCH-1 … ARCH-6)

Documentation teaches invariants; **architecture linting enforces them** in the editor and CI.

### Three layers

```text
CODE
  ├─ ESLint (eslint-plugin-crm + no-restricted-imports)
  ├─ dependency-cruiser (.dependency-cruiser.cjs)
  └─ check-messaging.mjs (contracts, APIs, queue ownership)
        ↓
ci:validate-events
        ↓
test:messaging (integration — proves TX/ACK/confirm/retry runtime)
```

### What ESLint blocks

| Rule | Blocks |
| ---- | ------ |
| `no-restricted-imports` | `amqplib`, `kafkajs` in handlers/modules/http/consumer |
| `crm/no-broker-control-in-handler` | `ack`, `nack`, `reject` in business layers |
| `crm/no-direct-broker-publish` | `publish`, `sendToQueue`, `import amqplib` in business layers |

Only `rabbitmq/`, `outbox-publisher/`, `messaging-kit/`, `event-delivery/` may touch the broker.

### Commands

```bash
yarn lint:architecture
yarn check:messaging
yarn verify:architecture
```

See [scripts/architecture/README.md](../../../scripts/architecture/README.md) and [common/21-architecture-guardrails.md](./common/21-architecture-guardrails.md).

### ARCH task tracker

| Task | Description | Status |
| ---- | ----------- | ------ |
| ARCH-1 | ESLint `no-restricted-imports` in domain layers | done |
| ARCH-2 | dependency-cruiser forbidden dependencies | done |
| ARCH-3 | `check-messaging.mjs` static contract checks | done |
| ARCH-4 | Custom `eslint-plugin-crm` rules | done |
| ARCH-5 | Integration tests (`yarn test:messaging`) | existing |
| ARCH-6 | RFC2 gates (no transport fields in domain outbox) | planned |

### PR rule (extends Step 28)

Messaging PRs must pass `yarn verify:architecture` before merge.

---

## Frozen architecture context

The messaging architecture stays frozen:

1. **RabbitMQ correctness first** — transactional outbox, idempotent consumers, verified topology.
2. **Broker-neutral delivery later (RFC2)** — `outbox_deliveries` + `EventSink` / `RabbitMqSink`.
3. **Kafka optional when needed** — not part of the current default runtime.

Do not redesign this in documentation or code unless explicitly requested.

---

## Changelog (August 2026)

Documentation updated for RabbitMQ connection lifecycle refactor:

- New [common/22-connection-lifecycle.md](./common/22-connection-lifecycle.md) — `connectManaged`, `setup()`, `invalidate()`, `isReady()` vs `isConnected()`
- [06-consuming-and-idempotency.md](./common/06-consuming-and-idempotency.md), [08-retries-dlq-parking.md](./common/08-retries-dlq-parking.md) — tier retry + parking as **CURRENT** for Node DB consumers
- [18-rfc1-target.md](./common/18-rfc1-target.md) — lifecycle + retry items marked implemented
- Per-service `DEVELOPER.md` / `OPERATIONS.md` for messaging consumers
- [devops/prod/DEPLOY-STRATEGY.md](../devops/prod/DEPLOY-STRATEGY.md) — `@crm/messaging-kit` Docker build gap
- `services/rabbitmq-lab-service/README.md` — lab vs production lifecycle contrast
