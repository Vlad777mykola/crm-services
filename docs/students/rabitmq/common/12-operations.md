# Operations

## Development

**CURRENT VERIFIED**

- Single-node RabbitMQ in Docker
- Management UI enabled
- App services declare topology on startup
- Destructive queue resets allowed via scripts

### Check queue depth

Management UI → Queues, or `scripts/messaging/cli.mjs`.

### Stuck consumers

- No active consumer on queue in Management UI
- Service logs show connection errors
- Readiness endpoint reports RabbitMQ unhealthy when `isReady()` is false (not just TCP down)

### Replay (dev)

Use messaging CLI after inspecting dead/parked queues.

---

## Production

**TARGET — not local Docker architecture**

- Managed/clustered RabbitMQ with TLS
- Secret-managed credentials, per-environment vhost
- Least-privilege broker users
- Monitoring: queue depth, consumer lag, DLQ growth
- Alerts on sustained backlog or DLQ insert rate
- No destructive queue purges without runbook
- Durable queues; evaluate quorum queues for critical paths
- Publisher confirms, manual ACK

See [13-production-rules.md](./13-production-rules.md).

---

## Retry / parking queues

**CURRENT VERIFIED** — Node DB-backed consumers declare tier + parking queues via `declareRetryTopology()`. Monitor parking queue depth per service. See [08-retries-dlq-parking.md](./08-retries-dlq-parking.md) and [22-connection-lifecycle.md](./22-connection-lifecycle.md).

---

## Next

[13-production-rules.md](./13-production-rules.md)
