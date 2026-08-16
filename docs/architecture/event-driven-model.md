# Event-Driven Model

## Envelope

Every event on the wire (RabbitMQ) uses one standard envelope, defined in [`contracts/events/envelope.v1.json`](../../contracts/events/envelope.v1.json):

```ts
type EventEnvelope<TData> = {
  id: string;            // unique event id
  type: string;          // e.g. "appointment.requested"
  source: string;        // e.g. "api-service"
  version: string;       // envelope/schema version, e.g. "1.0"
  time: string;          // ISO 8601 timestamp
  correlationId: string; // ties an event back to the request/trigger that caused it
  data: TData;
};
```

Rules:
- Every event has a unique `id`, `type`, `source`, `version`, `time`, and `correlationId`.
- Events carry IDs and safe summary data — never secrets, never full private records unless required by the consumer.

## Outbox pattern

The backend never publishes to RabbitMQ directly from the request path. Instead:

1. A business transaction (e.g. "approve appointment") writes its business rows **and** an `outbox_events` row in the same database transaction.
2. `outbox-publisher` (a separate service, see [`target-production-architecture.md`](target-production-architecture.md)) polls `outbox_events` for pending rows, publishes each to the `exchange`/`routing_key` recorded on the row, and marks it `published`.
3. If publishing fails, `outbox-publisher` increments `attempts` and schedules `next_retry_at`; after `MAX_ATTEMPTS` the row is marked `failed` and is inspectable.

This guarantees an event is never lost just because RabbitMQ was briefly unavailable when the business transaction committed.

## Exchanges, retry tiers, parking, and dead-letter queues

```txt
Exchanges:
  domain.events          (topic, durable) — appointment/review lifecycle events
  analytics.events       (topic, durable) — results published by analytics/AI workers
  commands               (topic, durable) — reserved for future command-style messages
  domain.events.dlx       (topic, durable) — dead-letter target for domain queues (inspection)
  commands.dlx            (topic, durable) — dead-letter target for commands

Per-consumer main queue:
  {service}.q            — e.g. users-service.q

Retry tier queues (per DB-backed Node consumer, per source exchange):
  {service}.domain.retry.5s.q | .30s.q | .5m.q
  {service}.analytics.retry.5s.q | …     — when bound to analytics.events

Parking (after tiers exhaust):
  {service}.domain.parking.q
  {service}.analytics.parking.q

Dead-letter / inspection queues (legacy binding, CLI tooling):
  auth.dead.q, users.dead.q, notifications.dead.q, ai.dead.q, outbox.dead.q, …
```

Declared by each service's `rabbitmq/topology.ts` + `declareRetryTopology()` in
`@crm/messaging-kit`. Student detail: [docs/students/rabitmq/common/08-retries-dlq-parking.md](../students/rabitmq/common/08-retries-dlq-parking.md).

## Retry and connection lifecycle policy

See `services/*/src/rabbitmq/consumer.ts` and `services/messaging-kit/`:

- DB-backed consumers that cannot process a message call `handleConsumerFailure()` to republish through finite retry tiers (5s → 30s → 5m) and then to a parking queue, ACKing the original away from the main queue.
- TCP lifecycle is centralized in `connectManaged()` (`setup`, `invalidate`, exponential backoff reconnect).
- Unexpected consumer channel closure triggers `invalidate()` and a full reconnect/setup cycle.
- Readiness endpoints use `isReady()` — true only after topology + `consume()` are active, not merely when TCP is open.
- `metrics-service` is an observer: failures are NACKed without requeue (no retry topology).
- `outbox-publisher` retries with `next_retry_at` backoff and gives up after `MAX_ATTEMPTS`, marking the row `failed` rather than retrying forever. Own ConfirmChannel lifecycle (not `connectManaged`).

Full lifecycle doc: [docs/students/rabitmq/common/22-connection-lifecycle.md](../students/rabitmq/common/22-connection-lifecycle.md).

## Shared messaging library (`@crm/messaging-kit`)

Location: `services/messaging-kit/`. Workspace package — not published standalone.

| Export | Role |
| ------ | ---- |
| `connectManaged` | TCP connect, reconnect, `isReady()` / `isConnected()` |
| `declareRetryTopology` | Retry tier + parking queue declarations |
| `handleConsumerFailure` | Republish to next tier or parking |
| Correlation / error helpers | `resolveCorrelationId`, error taxonomy |

Consumers import messaging-kit for **infrastructure only**. Business logic stays in
handlers and inbox transactions. No generic `MessageBus`.

Docker: messaging-kit consumers need workspace-aware image builds — [workspace-docker-build.md](./workspace-docker-build.md).

## Domain events

| Event type | Published by | Exchange | Routing key |
|---|---|---|---|
| `appointment.requested` | backend (via outbox) | `domain.events` | `appointment.requested` |
| `appointment.approved` | backend (via outbox) | `domain.events` | `appointment.approved` |
| `appointment.rejected` | backend (via outbox) | `domain.events` | `appointment.rejected` |
| `appointment.cancelled` | backend (via outbox) | `domain.events` | `appointment.cancelled` |
| `appointment.completed` | backend (via outbox) | `domain.events` | `appointment.completed` |
| `review.received` | backend (via outbox) | `domain.events` | `review.received` |

## Analytics / AI result events

| Event type | Published by | Exchange | Consumed by |
|---|---|---|---|
| `analytics.company_rating_updated` | ai-service | `analytics.events` | notifications-service |
| `ai.appointment_recommendation_created` | ai-service | `analytics.events` | appointments-service (Phase 12, moved from backend-projection-service) |
| `ai.company_insight_created` | ai-service | `analytics.events` | companies-service (Phase 12, moved from backend-projection-service) |
| `ai.job_failed` | ai-service | `analytics.events` | (observability only — metrics-service) |

## Idempotent consumers

Every worker that writes data keeps a `processed_events(event_id, consumer_name, processed_at)` table:

1. Receive message.
2. Try to insert `(event_id, consumer_name)` into `processed_events`.
3. If the insert conflicts (already processed), ack and skip.
4. Otherwise process the message (inside a DB transaction, if the service has one).
5. Commit.
6. Ack the message.
7. On failure, `handleConsumerFailure()` applies retry tiers / parking (DB-backed consumers), or NACK without requeue (`metrics-service` observer).

## Backend API and RabbitMQ

The backend API process is HTTP-only. It never opens a RabbitMQ consumer. Anything that needs to react to a RabbitMQ event (AI results, analytics results) is handled by a dedicated service (`notifications-service`, or — since Phase 12 — whichever domain service owns the derived projection, e.g. `appointments-service` for `ai.appointment_recommendation_created`) that writes into the database on the API's behalf — the API only ever reads what those services wrote.
