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
| Consumer inbox transactions | **CURRENT** — Node + AI outbox path |
| Atomic publisher claims (`FOR UPDATE SKIP LOCKED`) | **CURRENT** |
| Publisher confirms + mandatory routing | **CURRENT** — outbox-publisher |
| Publisher reconnect/backoff | **CURRENT** — outbox-publisher |
| `connectManaged` connection lifecycle (`setup`, `invalidate`, `isReady`) | **CURRENT** — Node consumers via `@crm/messaging-kit` |
| Channel-close → invalidate → full reconnect | **CURRENT** — Node consumers |
| Finite retry tiers + parking (`handleConsumerFailure`) | **CURRENT** — Node DB-backed consumers |
| Health readiness uses `isReady()` not TCP-only | **CURRENT** — Node messaging consumers |
| Replay/troubleshooting CLI | **CURRENT** |
| Contract validation CI | **CURRENT** |
| Correlation helpers | **CURRENT** |
| Messaging integration harness | **CURRENT** |
| Workspace-aware Docker builds for messaging-kit consumers | **TARGET** — per-service Dockerfile context gap |
| AI transactional outbox | `MESSAGING_MODE=outbox` available; default still `direct` |
| Observability metrics to monitoring | **Not complete** |
| Lab service: tier retry / parking lessons | **Partial** — production pattern in messaging-kit; lab teaches pieces separately |

---

## Retry model

Tiers: 5s → 30s → 5m → parking. See [08-retries-dlq-parking.md](./08-retries-dlq-parking.md).

Connection lifecycle: [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Production gate

Do not deploy RabbitMQ to production until [rfc1-production-gate.md](../../../architecture/rfc1-production-gate.md) checklist is complete.

---

## Do not confuse with RFC2

RFC1 improves **RabbitMQ correctness**. RFC2 changes **how routing/sinks work**. They are separate phases.

---

## Next

[19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md)
