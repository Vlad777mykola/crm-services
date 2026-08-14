# auth-service — Developer Guide

## Status

**CURRENT VERIFIED**

## Code map

| Area | Path |
| ---- | ---- |
| Topology | `src/rabbitmq/topology.ts` |
| Consumer | `src/rabbitmq/consumer.ts` |
| Outbox | `src/outbox/outbox-repository.ts` |
| Inbound processing | `src/consumer/process-inbound-event.ts` |
| Handlers | `src/handlers/company-member-events.ts` |
| Idempotency | `src/idempotency/processed-events-repository.ts` |
| Schema | `src/db/schema.ts` |

## Publishing

Outbox row in same TX as identity creation. Routing: `domain.events` / `auth.user_registered`.

## Consuming

Inbox TX: `processed_events` → handler → commit → ACK. Uses `@crm/messaging-kit` retry topology on `domain.events`.

## What not to do

See [common/15-add-new-consumer.md](../../common/15-add-new-consumer.md) forbidden list.

## Code review checklist

- [ ] New events have contract + outbox routing
- [ ] Consumer handlers idempotent
- [ ] EVENTS.md and SERVICES.md updated
