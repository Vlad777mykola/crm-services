# RFC1 Target — Reliable RabbitMQ

## Current status

**TARGET RFC1** — many items implemented per [rfc1-production-gate.md](../../../architecture/rfc1-production-gate.md). Label each capability CURRENT vs TARGET when documenting a specific service.

---

## RFC1 goals

Correct RabbitMQ behavior before production and before RFC2 broker-neutral cutover.

---

## CURRENT vs RFC1

| Capability | Status |
| ---------- | ------ |
| Consumer inbox transactions | Implemented (Node + AI outbox path) |
| Atomic publisher claims (`FOR UPDATE SKIP LOCKED`) | Implemented |
| Publisher confirms + mandatory routing | Implemented |
| Publisher reconnect/backoff | Implemented |
| Finite retry tiers + parking (`@crm/messaging-kit`) | Library implemented; verify per consumer |
| Replay/troubleshooting CLI | Implemented |
| Contract validation CI | Implemented |
| Correlation helpers | Implemented |
| Messaging integration harness | Implemented |
| AI transactional outbox | `MESSAGING_MODE=outbox` available; default still `direct` |
| Observability metrics to monitoring | **Not complete** |

---

## Retry model

Tiers: 5s → 30s → 5m → parking. See [08-retries-dlq-parking.md](./08-retries-dlq-parking.md).

---

## Production gate

Do not deploy RabbitMQ to production until [rfc1-production-gate.md](../../../architecture/rfc1-production-gate.md) checklist is complete.

---

## Do not confuse with RFC2

RFC1 improves **RabbitMQ correctness**. RFC2 changes **how routing/sinks work**. They are separate phases.

---

## Next

[19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md)
