# Retries, DLQ, and Parking

## Current status

**CURRENT VERIFIED** — Node DB-backed consumers use `@crm/messaging-kit` retry tiers + parking.

**metrics-service** is the exception (drop on failure, no tiers).

---

## CURRENT: finite retry tiers (Node consumers)

When a DB-backed consumer cannot process a message:

1. Database transaction rolls back
2. `handleConsumerFailure()` (`services/messaging-kit/src/reliable-republish.ts`) republishes to the next tier
3. Original message ACKed on the main queue (no infinite requeue on main queue)
4. After tiers exhaust → parking queue

| Tier | TTL | Queue pattern |
| ---- | --- | ------------- |
| 1 | 5s | `{service}.domain.retry.5s.q` |
| 2 | 30s | `{service}.domain.retry.30s.q` |
| 3 | 5m | `{service}.domain.retry.5m.q` |
| Parking | — | `{service}.domain.parking.q` |

For `analytics.events` consumers, replace `domain` with `analytics` in queue names (e.g. `companies-service.analytics.retry.5s.q`).

Declared via `declareRetryTopology()` in each `rabbitmq/consumer.ts`. Inspect: `services/messaging-kit/src/retry.ts`.

If republish fails, the channel may close; the consumer's `channel.once('close')` listener calls `invalidate()` for a full reconnect. See [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## CURRENT: dead-letter queues (legacy / inspection)

Queues still declare `x-dead-letter-exchange` for compatibility. The **standard** failure path is tier retry + parking, not immediate NACK → DLX.

Dead queues (`auth.dead.q`, `users.dead.q`, …) remain bound to `domain.events.dlx` for inspection and CLI tooling.

Inspect parked/dead messages: `scripts/messaging/cli.mjs`, `yarn messaging:dlq:list`.

---

## CURRENT: outbox publisher retries

`outbox-publisher` increments `attempts`, sets `next_retry_at`, marks `failed` after `MAX_ATTEMPTS` (default 5). Unpublishable rows are inspectable in DB. Uses its own connection lifecycle (not `connectManaged`).

---

## Replay

CLI: `scripts/messaging/cli.mjs` — list/replay parked and dead messages.

---

## What students should understand

- Parking is for **events that need human decision** after retries exhaust
- Retries are **finite** — no infinite loops on main queue
- DLQ depth is a **signal** — investigate growth, do not ignore
- Readiness requires a working consumer channel, not just TCP ([22-connection-lifecycle.md](./22-connection-lifecycle.md))

---

## Next

[09-local-development.md](./09-local-development.md)
