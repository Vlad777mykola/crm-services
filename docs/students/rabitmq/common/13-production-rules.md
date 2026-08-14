# Production Rules

## Current status

**CURRENT VERIFIED** — rules from `docs/architecture/rfc1-production-gate.md` and operational practice.

---

## Broker

- Managed/clustered RabbitMQ (not dev Docker image)
- TLS for AMQP connections
- Per-environment vhost isolation
- Credentials from secrets manager — never commit production URLs

---

## Queues and messages

- Durable queues for all application queues
- Manual consumer ACK only
- Publisher confirms enabled (outbox-publisher)
- Evaluate quorum queues for correctness-critical long-lived queues

---

## Application rules

- Transactional outbox for all domain publishers
- Idempotent consumers with `processed_events`
- No direct RabbitMQ publish from HTTP handlers
- Contract validation in CI (`yarn ci:validate-events`)
- Correlation IDs on all events

---

## Failure handling

- Finite retries (**TARGET RFC1** tiers + parking)
- DLQ inspection runbooks
- Outbox `failed` rows monitored and alertable

---

## What must never be done in production

- Purge queues without understanding message loss impact
- Change bindings manually without code/deploy alignment
- Disable publisher confirms
- Auto-ACK consumers
- Reset databases without coordinating broker state (see RFC2 cutover doc)

---

## RFC1 production gate

Checklist: [rfc1-production-gate.md](../../../architecture/rfc1-production-gate.md)

---

## Next

[14-add-new-event.md](./14-add-new-event.md)
