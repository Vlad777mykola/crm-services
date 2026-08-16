# RabbitMQ Glossary

Terms used throughout the student and developer documentation.

| Term | Definition |
| ---- | ---------- |
| **ACK** | Consumer acknowledges successful processing. RabbitMQ removes the message from the queue. |
| **AMQP** | Advanced Message Queuing Protocol. RabbitMQ speaks AMQP 0-9-1 on port 5672. |
| **At-least-once delivery** | A message may arrive more than once. Consumers must be idempotent. This repo does **not** guarantee exactly-once. |
| **Binding** | Link between an exchange and a queue using a routing key pattern. |
| **Broker** | RabbitMQ server that routes messages between publishers and consumers. |
| **Channel** | Lightweight connection inside an AMQP connection. Topology and publish/consume happen on channels. |
| **Commands exchange** | `commands` — reserved topic exchange for future command-style messages. |
| **Consumer** | Service process that reads messages from a queue and processes them. |
| **Correlation ID** | `correlationId` in the event envelope. Ties an event chain back to the originating request. |
| **Dead-letter exchange (DLX)** | `domain.events.dlx` — receives messages that are nacked without requeue or expire. |
| **Domain events exchange** | `domain.events` — topic exchange for business lifecycle facts. |
| **Analytics events exchange** | `analytics.events` — topic exchange for AI/analytics results. |
| **Envelope** | Standard wire wrapper (`id`, `type`, `source`, `version`, `time`, `correlationId`, `data`). Defined in [`contracts/events/envelope.v1.json`](../../../contracts/events/envelope.v1.json). |
| **Event contract** | JSON Schema in `contracts/events/` describing the `data` payload for one event type. |
| **Event type** | Dot-separated past-tense name, e.g. `auth.user_registered`, `appointment.requested`. |
| **Idempotency** | Safe re-processing: duplicate delivery has no additional business effect. Implemented via `processed_events`. |
| **Inbox transaction** | Consumer DB transaction: insert `processed_events` → business handler → commit → ACK. |
| **NACK** | Negative acknowledgment. With `requeue=false`, message goes to DLX. |
| **Outbox** | `outbox_events` table written in the same DB transaction as the business change. |
| **Outbox publisher** | `outbox-publisher` service that polls pending outbox rows and publishes to RabbitMQ. |
| **Parking queue** | Final destination for messages that exhausted retry tiers (`{service}.domain.parking.q`). **CURRENT** for Node DB-backed consumers. |
| **Processed events** | Per-consumer table `(event_id, consumer_name, processed_at)` for deduplication. |
| **Publisher** | Component that sends messages to an exchange. In this repo, usually `outbox-publisher`, not HTTP handlers. |
| **Queue** | Named buffer bound to an exchange. Each consuming service owns one main queue, e.g. `users-service.q`. |
| **Retry tier** | **TARGET RFC1** — timed delay queues (`5s`, `30s`, `5m`) before parking. Implemented in `@crm/messaging-kit`. |
| **Routing key** | String used by topic exchanges to route messages. Usually equals the event type. |
| **Topic exchange** | Exchange type that matches routing keys with patterns (`exact.key`, `appointment.*`, `#`). |
| **Transactional outbox** | Pattern: business row + outbox row in one DB commit; separate process publishes to broker. |
| **Vhost** | Virtual host. Local dev uses `crm-dev`. |
| **EventSink** | **TARGET RFC2** — broker-neutral delivery interface (`RabbitMqSink`, future `KafkaSink`). |
| **outbox_deliveries** | **TARGET RFC2** — per-broker delivery tracking table. |

## Status label meanings

| Label | Meaning |
| ----- | ------- |
| **CURRENT VERIFIED** | Exists in code today; facts checked against source. |
| **TARGET RFC1** | Approved reliable RabbitMQ plan; may be partially implemented. |
| **TARGET RFC2** | Broker-neutral delivery cutover; not the current default runtime. |
| **FUTURE KAFKA** | Optional later; not required to run this repository. |
