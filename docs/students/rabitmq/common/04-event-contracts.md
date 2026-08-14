# Event Contracts

## Current status

**CURRENT VERIFIED**

---

## What is an event?

A **past-tense fact** that already happened: `auth.user_registered`, `appointment.requested`, `review.received`.

Not imperative commands. Domain facts use dot-separated names: `<aggregate>.<past_tense_verb>`.

---

## Envelope (wire format)

[`contracts/events/envelope.v1.json`](../../../../contracts/events/envelope.v1.json) wraps every message:

| Field | Purpose |
| ----- | ------- |
| `id` | Unique event instance (UUID) |
| `type` | Event type (= routing key) |
| `source` | Publishing service name |
| `version` | Schema version, e.g. `1.0` |
| `time` | ISO 8601 timestamp |
| `correlationId` | Chain tracing |
| `data` | Payload per event schema |

---

## Payload schemas

Each event has `contracts/events/<event.type>.v1.json` describing `data`:

- `required` array explicit
- `additionalProperties: false`
- UUID/timestamp `format` where applicable

Example: [`auth.user_registered.v1.json`](../../../../contracts/events/auth.user_registered.v1.json)

---

## Contract-first gate

Before implementing a publisher or consumer:

1. Write JSON Schema in `contracts/events/`
2. Add routing to outbox map (producer)
3. Update `contracts/events/README.md`
4. Then write code

See [event-catalog.md](../../../architecture/event-catalog.md) for implementation status.

---

## Validation

CI validates schemas: `yarn ci:validate-events` (see root `package.json`).

Consumers should validate `data` at runtime before processing.

---

## All current schema files

Listed in [SERVICES.md](../SERVICES.md) and [event-catalog.md](../../../architecture/event-catalog.md).

---

## Next

[05-publishing-and-outbox.md](./05-publishing-and-outbox.md)
