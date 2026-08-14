# Testing Messaging

## Current status

**CURRENT VERIFIED**

---

## Testing curriculum

| Lesson | Goal |
| ------ | ---- |
| 1 | Publish a known valid message manually |
| 2 | Observe queue routing |
| 3 | Observe consumer processing |
| 4 | Send same event twice (idempotency) |
| 5 | Break handler intentionally |
| 6 | Stop RabbitMQ |
| 7 | Restart RabbitMQ |
| 8 | Retry flow (**TARGET RFC1**) |
| 9 | Parking queue (**TARGET RFC1**) |
| 10 | Replay parked event (**TARGET RFC1**) |
| 11 | Trace correlationId across services |
| 12 | Trace outbox from DB to broker |

Each lesson needs: goal, setup, action, expected behavior, code to inspect, cleanup, questions.

---

## Repository test commands

Inspect root `package.json` before running:

| Command | Purpose |
| ------- | ------- |
| `yarn test:messaging` | Messaging integration harness |
| `yarn ci:validate-events` | Contract schema validation |
| Per-service `yarn test` | Unit/integration tests in service dir |

**Do not invent commands** — verify in `package.json` first.

---

## Test matrix (every consumer service)

| Scenario | Expected result |
| -------- | --------------- |
| Valid event | Business effect committed, ACK |
| Duplicate event | No duplicate effect, ACK |
| Handler exception | TX rolled back, NACK → DLQ |
| Invalid payload | Rejected per validation rules |
| Wrong routing key | Consumer receives nothing |

Each test documents: PRECONDITIONS, ACTION, EXPECTED DB STATE, EXPECTED BROKER STATE, EXPECTED LOG, ACK/NACK, CLEANUP.

---

## Example: duplicate delivery (users-service)

**PRECONDITIONS:** users-service running; `auth.user_registered` already processed once.

**ACTION:** Republish same envelope (same `id`) to `domain.events` / `auth.user_registered`.

**EXPECTED DB:** No second profile row; `processed_events` unchanged.

**EXPECTED BROKER:** Message ACKed; queue depth returns to 0.

**EXPECTED LOG:** Duplicate skip log (inspect consumer).

---

## Example: messaging integration

```powershell
yarn test:messaging
```

**Expected:** Harness tests pass (verify output when run locally).

---

## TARGET RFC1 tests

Retry tier progression, parking visibility, safe replay — document expected behavior in service `TESTING.md` when RFC1 wiring is verified for that service.

---

## Next

[11-debugging.md](./11-debugging.md)
