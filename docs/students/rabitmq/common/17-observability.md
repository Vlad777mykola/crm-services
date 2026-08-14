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

RabbitMQ-connected services include broker connectivity in health checks. Inspect `src/http/health.routes.ts` per service.

When broker is down: readiness fails; HTTP API may still serve (depends on service).

---

## Logs

Look for:

- Connection established / reconnecting
- Event processed / duplicate skipped
- Validation failure
- Handler exception → NACK

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
