# Retries, DLQ, and Parking

## Current status

**CURRENT VERIFIED** — dead-letter behavior.

**TARGET RFC1** — retry tiers and parking (library exists; verify per-consumer wiring).

---

## CURRENT: dead-letter on failure

When a consumer cannot process a message:

1. Database transaction rolls back
2. Consumer NACKs with `requeue=false`
3. Message routes to `domain.events.dlx`
4. Lands on `{service}.dead.q` (bound with `#`)

Inspect dead messages via Management UI or `scripts/messaging/cli.mjs`.

---

## CURRENT: outbox publisher retries

`outbox-publisher` increments `attempts`, sets `next_retry_at`, marks `failed` after `MAX_ATTEMPTS` (default 5). Unpublishable rows are inspectable in DB.

---

## TARGET RFC1: finite retry tiers

`@crm/messaging-kit` (`services/messaging-kit/src/retry.ts`):

| Tier | TTL | Queue pattern |
| ---- | --- | ------------- |
| 1 | 5s | `{service}.domain.retry.5s.q` |
| 2 | 30s | `{service}.domain.retry.30s.q` |
| 3 | 5m | `{service}.domain.retry.5m.q` |
| Parking | — | `{service}.domain.parking.q` |

`handleConsumerFailure()` republishes to next tier, then ACKs original.

---

## TARGET RFC1: replay

CLI: `scripts/messaging/cli.mjs` — list/replay parked and dead messages.

---

## What students should understand

- DLQ is for **inspection**, not silent deletion
- Parking is for **events that need human decision** after retries exhaust
- Retries are **finite** — no infinite loops on main queue

---

## Next

[09-local-development.md](./09-local-development.md)
