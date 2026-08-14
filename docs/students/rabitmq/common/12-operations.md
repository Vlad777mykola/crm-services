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
- Readiness endpoint reports RabbitMQ unhealthy

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

**TARGET RFC1** — per-service retry and parking queues. Document in service `OPERATIONS.md` when verified.

---

## Next

[13-production-rules.md](./13-production-rules.md)
