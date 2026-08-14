# Publishing and Outbox

## Current status

**CURRENT VERIFIED**

---

## Why outbox?

Publishing inside an HTTP request is unsafe: if RabbitMQ is down, you either lose the event or roll back valid business data. The **transactional outbox** writes the event to the database in the **same transaction** as the business change. A separate process publishes later.

---

## Flow

```text
HTTP handler
  → BEGIN TX
  → INSERT business rows
  → INSERT outbox_events (status=pending, exchange, routingKey, payload)
  → COMMIT
  → (async) outbox-publisher polls
  → publish to RabbitMQ
  → UPDATE status=published
```

---

## Outbox table

Per-service schema, e.g. `auth_schema.outbox_events`. Written via `outbox-repository.ts` in each publisher service.

Key columns: `event_id`, `event_type`, `exchange`, `routing_key`, `payload`, `status`, `attempts`, `next_retry_at`.

---

## outbox-publisher

[`services/outbox-publisher/`](../../../../services/outbox-publisher/)

- Deployed once per `OUTBOX_SCHEMA`
- Uses `FOR UPDATE SKIP LOCKED` for atomic claims
- Publisher confirms + mandatory routing (**CURRENT VERIFIED** per RFC1 gate)
- On failure: backoff, `MAX_ATTEMPTS`, then `failed` status

Guide: [outbox-publisher docs](../services/outbox-publisher/README.md)

---

## Routing map

Each service's outbox repository maps `event_type` → `exchange` + `routing_key`. Example: `auth.user_registered` → `domain.events` / `auth.user_registered`.

Inspect: `services/auth-service/src/outbox/outbox-repository.ts`

---

## ai-service exception

**CURRENT VERIFIED:** `MESSAGING_MODE=direct` (default) publishes to RabbitMQ after DB commit in the consumer handler. `MESSAGING_MODE=outbox` uses `ai_schema.outbox_events` + `outbox-publisher-ai`.

**TARGET RFC1:** AI should use transactional outbox consistently.

---

## What NOT to do

❌ `channel.publish()` from HTTP handler for domain events

❌ Outbox row in a separate transaction from business change

---

## TARGET RFC2

Domain producer writes broker-neutral `outbox_events`; `event-delivery` creates `outbox_deliveries` rows; `RabbitMqSink` chooses exchange/routing key. See [19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md).

---

## Next

[06-consuming-and-idempotency.md](./06-consuming-and-idempotency.md)
