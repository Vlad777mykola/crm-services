# Observability

## Current status

**CURRENT VERIFIED** — partial. Full metrics export to monitoring is **TARGET RFC1** (unchecked in production gate).

---

## What to monitor

| Signal | Source |
| ------ | ------ |
| Queue depth | RabbitMQ Management / Prometheus plugin |
| Consumer count | RabbitMQ Management |
| DLQ growth rate | `{service}.dead.q` depth |
| Outbox pending/failed | `outbox_events` table queries |
| Connection failures | Service logs, readiness endpoints |
| Event throughput | metrics-service (dev observer), future Prometheus |

---

## Health / readiness

RabbitMQ-connected Node services use **`consumer.isReady()`** in readiness checks — true only after channel, topology, and `consume()` are fully set up (not merely TCP-connected). Inspect `src/http/health.routes.ts` per service.

When broker is down or the consumer channel is dead: readiness fails; HTTP API may still serve (depends on service).

See [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Logs

Look for:

- Connection established / reconnecting
- Event processed / duplicate skipped
- Validation failure
- Handler exception → retry tier / parking republish
- Channel closed unexpectedly → invalidate → reconnecting

---

## Correlation

Propagate `correlationId` through outbox and handlers. Use `@crm/messaging-kit` `resolveCorrelationId`.

---

## metrics-service (dev)

In-memory counters per `eventType` + `exchange`. Not durable — for local observation only.

---

## TARGET RFC1

Wire messaging metrics to Prometheus/Datadog in deployment. See [rfc1-production-gate.md](../../../architecture/rfc1-production-gate.md).

---

## Next

[18-rfc1-target.md](./18-rfc1-target.md)
