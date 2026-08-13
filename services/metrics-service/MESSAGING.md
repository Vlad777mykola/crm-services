# Metrics service messaging semantics

`metrics-service` is an **at-least-once observational** consumer:

- Duplicate RabbitMQ deliveries can inflate counters.
- Process restart loses in-memory metric history.
- Failed messages are dropped (no inbox transaction, no retry tiers) because metrics are diagnostic-only.

## Future decision (TODO)

If exact or rebuildable metrics become a product requirement, choose one of:

1. **Durable metrics store** — persist aggregates in PostgreSQL or a time-series DB with idempotent upserts.
2. **Kafka consumer later** — use a replayable event stream with deterministic aggregation keys.

Until then, do not use metrics-service counts for billing, SLA enforcement, or audit trails.
