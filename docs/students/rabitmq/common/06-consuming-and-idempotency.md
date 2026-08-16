# Consuming and Idempotency

## Current status

**CURRENT VERIFIED**

---

## Consumer flow

```text
message on {service}.q
  → parse envelope
  → validate payload schema
  → BEGIN TX
  → INSERT processed_events (event_id, consumer_name)
      → conflict? COMMIT + ACK + return (duplicate)
  → business handler
  → COMMIT
  → ACK
```

On handler failure: ROLLBACK → `handleConsumerFailure()` (retry tiers or parking) → ACK original away from main queue.

Connection lifecycle: [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Inbox transaction

The consumer's database work and idempotency check happen in **one transaction**. ACK happens **after** commit.

Inspect pattern: `services/users-service/src/consumer/process-inbound-event.ts`

---

## processed_events

```sql
CREATE TABLE processed_events (
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, consumer_name)
);
```

`consumer_name` is a stable string per service, e.g. `'users-service'`.

---

## At-least-once, not exactly-once

Messages can be redelivered. Idempotency makes duplicates safe. Never assume a message arrives exactly once.

---

## metrics-service exception

**CURRENT VERIFIED:** No `processed_events`, no DB. In-memory counters only. Failures `nack(msg, false, false)` without retry topology. Still uses `connectManaged` for reconnect/readiness.

---

## Duplicate example (users-service)

1. `auth.user_registered` delivered with `event_id=abc`
2. Handler creates profile, commits, ACK
3. Same message redelivered (broker retry or network glitch)
4. `INSERT processed_events` conflicts → skip handler, ACK

---

## Failure example (DB-backed consumers)

1. Handler throws mid-transaction
2. ROLLBACK (no processed_events row, no business change)
3. `handleConsumerFailure()` republishes to `users-service.domain.retry.5s.q` (first tier)
4. Original message ACKed on main queue
5. After tiers exhaust → `users-service.domain.parking.q`
6. If republish fails → channel may close → `invalidate()` → full reconnect ([22-connection-lifecycle.md](./22-connection-lifecycle.md))

Legacy dead-letter queues (`{service}.dead.q`) still exist for topology compatibility; standard failure path is tier retry + parking, not immediate DLX nack.

---

## Next

[07-routing-topology.md](./07-routing-topology.md)
