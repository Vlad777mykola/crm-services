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

## Exchanges and dead-letter queues

```txt
Exchanges:
  domain.events          (topic, durable) — appointment/review lifecycle events
  analytics.events       (topic, durable) — results published by analytics/AI workers
  commands               (topic, durable) — reserved for future command-style messages
  domain.events.dlx       (topic, durable) — dead-letter target for domain.events
  commands.dlx            (topic, durable) — dead-letter target for commands

Dead-letter queues:
  notifications.dead.q
  ai.dead.q
  outbox.dead.q
```

Minimum retry policy (see `services/*/src/rabbitmq/topology.*`):
- A consumer that cannot process a message acks it away from the main queue (nack without requeue) so it lands on the bound dead-letter queue instead of looping forever.
- `outbox-publisher` retries with `next_retry_at` backoff and gives up after `MAX_ATTEMPTS`, marking the row `failed` rather than retrying forever.

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
| `ai.appointment_recommendation_created` | ai-service | `analytics.events` | backend-projection-service |
| `ai.company_insight_created` | ai-service | `analytics.events` | backend-projection-service |
| `ai.job_failed` | ai-service | `analytics.events` | (observability only — metrics-service) |

## Idempotent consumers

Every worker that writes data keeps a `processed_events(event_id, consumer_name, processed_at)` table:

1. Receive message.
2. Try to insert `(event_id, consumer_name)` into `processed_events`.
3. If the insert conflicts (already processed), ack and skip.
4. Otherwise process the message (inside a DB transaction, if the service has one).
5. Commit.
6. Ack the message.
7. On failure, nack without requeue — the message lands on the service's dead-letter queue for inspection.

## Backend API and RabbitMQ

The backend API process is HTTP-only. It never opens a RabbitMQ consumer. Anything that needs to react to a RabbitMQ event (AI results, analytics results) is handled by a dedicated small service (`backend-projection-service`, `notifications-service`) that writes into the database on the API's behalf — the API only ever reads what those services wrote.
