# RFC1 production acceptance gate

Do not deploy RabbitMQ to production until all items below are verified:

- [x] Consumer inbox transactions (all DB-backed Node consumers + AI outbox path)
- [x] AI outbox structure + `MESSAGING_MODE` direct/outbox (default direct; canary before global outbox)
- [x] Atomic publisher claims (`FOR UPDATE SKIP LOCKED` + leases)
- [x] Publisher confirms + mandatory routability checks
- [x] Publisher reconnect/backoff without burning attempts on infrastructure outage
- [x] Finite retry tiers + parking queues (`declareRetryTopology`, `handleConsumerFailure`)
- [x] Consumer connection lifecycle (`connectManaged`: `setup`, `invalidate`, reconnect backoff)
- [x] Readiness reflects full consumer setup (`isReady()`, not TCP-only)
- [x] Replay/troubleshooting CLI (`yarn messaging:dlq:list`, `scripts/messaging/cli.mjs`)
- [x] Contract validation CI (`yarn ci:validate-events`)
- [x] Correlation helpers (`@crm/messaging-kit` / `resolveCorrelationId`)
- [x] Messaging integration harness (`yarn test:messaging`)
- [ ] Observability metrics exported to monitoring (wire Prometheus/Datadog in deployment)

## Production RabbitMQ rules

- Managed/clustered RabbitMQ, TLS, per-environment vhost, secret-managed credentials
- Durable queues, publisher confirms, manual consumer ACK
- Evaluate quorum queues for correctness-critical long-lived queues
- TTL/DLX owned by infrastructure policies, not competing app queue arguments
- Monitor parking queue depth (`{service}.domain.parking.q`) and retry tiers — not only `*.dead.q`

Student/operator detail: [docs/students/rabitmq/common/22-connection-lifecycle.md](../students/rabitmq/common/22-connection-lifecycle.md).
