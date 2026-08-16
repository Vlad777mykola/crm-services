# Connection Lifecycle (`connectManaged`)

## Current status

**CURRENT VERIFIED** — Node CRM consumers and `@crm/messaging-kit`.

---

## What problem this solves

Two bugs motivated centralizing connection lifecycle:

1. **Readiness lie:** TCP to RabbitMQ was open, but the consumer channel was dead (topology not declared, no active `consume()`). Health reported “ready” while messages were not processed.
2. **Stuck after channel death:** `handleConsumerFailure()` can close the channel when republish fails. Without invalidating the connection, the process stayed “connected” with no working consumer.

`connectManaged()` fixes both: readiness means **full setup completed**, and an unexpected channel close triggers a **full reconnect cycle**.

---

## Where lifecycle lives

| Layer | Owns | Does not own |
| ----- | ---- | ------------ |
| `@crm/messaging-kit` `connectManaged()` | TCP connect, reconnect scheduling, exponential backoff + jitter, graceful shutdown, re-running `setup()` after reconnect, `isConnected()` / `isReady()` | Topology, prefetch, `consume()`, ACK/NACK, retry republish, DLX, publisher confirms |
| `services/*/src/rabbitmq/consumer.ts` | Channel, topology, bindings, prefetch, consume loop, ACK/NACK, `handleConsumerFailure()` | TCP reconnect loop (delegates to `connectManaged`) |
| `services/outbox-publisher` | Own ConfirmChannel + confirms lifecycle | Not migrated to `connectManaged` |
| `services/rabbitmq-lab-service` | Educational copy in `src/rabbitmq/connection.ts` | Does not import `@crm/messaging-kit` (teaching isolation) |

Inspect: `services/messaging-kit/src/connect-managed.ts`, `services/users-service/src/rabbitmq/consumer.ts`.

---

## API (`@crm/messaging-kit`)

```text
connectManaged({
  url,
  serviceName,
  logger,
  connectionOptions?,   // optional amqplib Options.Connect passthrough
  setup(connection, context) { ... },
  onDisconnected?,
})

managed.isConnected()  // TCP connection exists
managed.isReady()      // setup() fully completed — use for health/readiness
managed.close()        // graceful shutdown
context.invalidate(reason)  // channel/topology unusable → reconnect cycle
```

Naming is intentional:

- **`setup`** — not `onConnected`. “Connected” is only the socket; `setup()` must finish before the service is ready.
- **`invalidate`** — not `reconnect`. Call when the current channel/setup is unusable; one reconnect cycle results even if called multiple times.

---

## Standard consumer pattern (Node)

```text
connectManaged({ setup })
  setup:
    createChannel()
    channel.once('close') → invalidate('channel closed')
    declareTopology + declareRetryTopology
    assertQueue + bindQueue + prefetch + consume
    mark ready (first setup complete)

handleMessage success → ack
handleMessage failure → handleConsumerFailure() → tier retry or parking → ack original
  (metrics-service: nack without requeue — observer only)
```

On `channel.close` (including after failed republish): `invalidate()` → close connection → backoff → `setup()` again.

---

## Readiness vs TCP connected

| Signal | Meaning | Use in health |
| ------ | ------- | ------------- |
| `isConnected()` | Broker TCP socket open | Internal; do not use alone for readiness |
| `isReady()` | Channel + topology + consumer active | **`/health/ready` must use this** |

Inspect: `services/*/src/http/health.routes.ts`, `services/notifications-service/src/app.ts`, `services/metrics-service/src/http/server.ts`.

`RabbitMqConsumer.isConnected()` on service consumers is wired to `managed.isReady()` for backward compatibility; prefer `isReady()` in new code.

---

## Failure + retry interaction

**CURRENT VERIFIED** for DB-backed Node consumers (not metrics-service):

1. Handler throws → transaction rolls back
2. `handleConsumerFailure()` republishes to next retry tier (5s → 30s → 5m) or parking queue
3. Original message ACKed away from main queue (no infinite requeue on main queue)
4. If republish fails, channel may close → `invalidate()` → full reconnect

See [08-retries-dlq-parking.md](./08-retries-dlq-parking.md).

**metrics-service:** uses `connectManaged` for lifecycle only; failures `nack(msg, false, false)` with no retry topology.

---

## Services using `connectManaged` (messaging-kit)

| Service | Retry topology | Notes |
| ------- | -------------- | ----- |
| users-service | `domain.events` | Consumer only |
| auth-service | `domain.events` | Publish + consume |
| companies-service | `analytics.events` | AI insight consumer |
| company-members-service | `domain.events` | |
| appointments-service | `domain.events` + `analytics.events` | |
| notifications-service | both exchanges | |
| metrics-service | none | Observer |

**Not migrated:** `outbox-publisher`, `rabbitmq-lab-service`, `ai-service` (Python).

---

## Local dev prerequisite

`@crm/messaging-kit` is a Yarn workspace package (`services/messaging-kit/`). Run `yarn install` from the **repo root** so consumers resolve the workspace link. Dev orchestration (`yarn dev`, `yarn dev full`) expects this layout.

---

## Docker build note

Per-service Dockerfiles (`services/<name>/Dockerfile` with build context = service folder) do **not** include the monorepo workspace. Services that depend on `@crm/messaging-kit` need a **repo-root build** (or an equivalent workspace-aware image) for production images. Until that is wired in compose, `yarn smoke:prod` / `docker/prod` builds for messaging-kit consumers may fail with `@crm/messaging-kit: Not found`.

See [devops/prod/DEPLOY-STRATEGY.md](../../devops/prod/DEPLOY-STRATEGY.md).

---

## What we deliberately did not add

- `amqp-connection-manager` or `nestjs-rmq`
- Generic `MessageBus` hiding broker semantics
- Replacing `amqplib`

**Deferred spikes:** `amqplib` 2.x native recovery, multi-URL broker failover.

---

## Lab service contrast

`rabbitmq-lab-service` keeps its own `connectManaged` in `src/rabbitmq/connection.ts` so students see the pattern without importing production shared code. Production CRM services use `@crm/messaging-kit`. Same ideas (`setup`/`invalidate`, reconnect), different package boundary.

---

## Next

[08-retries-dlq-parking.md](./08-retries-dlq-parking.md) · [13-production-rules.md](./13-production-rules.md)
