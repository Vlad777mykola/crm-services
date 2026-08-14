# rabbitmq-lab-service messaging

## Messaging status

**CURRENT VERIFIED** — student/dev-only, never deployed to production.

## Service role

Teaches RabbitMQ fundamentals hands-on, using the same connection/channel/
topology/publisher/consumer patterns as every real CRM service, without
risking real CRM topology. See
[docs/students/rabitmq/lab-service/START-HERE.md](../../lab-service/START-HERE.md).

## Why it uses RabbitMQ

RabbitMQ *is* the subject being taught — this service exists to give
students a safe, real broker connection to experiment against.

## Quick diagram

```text
POST /api/lab/hello
     │
     ▼
publishToDefaultExchange (exchange="")
     │
     ▼
student.rabbitmq-lab.hello.q
     │
     ▼
consumeStudentQueue (long-lived, manual ACK/NACK)
     │
     ▼
GET /api/lab/status
```

## Publishes

| Event | Exchange | Routing key | Outbox |
| ----- | -------- | ----------- | ------ |
| `{ message, sentAt }` (lab-only, not a CRM domain event) | default (`""`) | `student.rabbitmq-lab.hello.q` | none — direct publish is fine here, this is not a CRM domain fact |

## Consumes

| Event | Queue | Binding | Handler |
| ----- | ----- | ------- | ------- |
| its own hello messages | `student.rabbitmq-lab.hello.q` | default exchange, routing key = queue name | `src/labs/hello/index.ts` |

## Queue

`student.rabbitmq-lab.hello.q` (LAB-02). Future labs each own their own
`student.rabbitmq-lab.*` queue — see
[lab-service/START-HERE.md](../../lab-service/START-HERE.md).

## Exchanges

Declared in `src/rabbitmq/topology.ts`: `student.rabbitmq-lab.direct`,
`student.rabbitmq-lab.topic`, `student.rabbitmq-lab.fanout`,
`student.rabbitmq-lab.headers`. Not yet used by a lab beyond `hello`
(default exchange, no named exchange involved).

## Outbox

None — this service intentionally publishes directly (it is not a CRM
domain-fact publisher; see [DEVELOPER.md](./DEVELOPER.md) for why that rule
does not apply here).

## Idempotency

None yet (LAB-07 — `processed_events`/inbox transaction — not implemented).

## Important code locations

- `services/rabbitmq-lab-service/src/rabbitmq/names.ts` — the namespace guard
- `services/rabbitmq-lab-service/src/rabbitmq/connection.ts` / `channel.ts` / `topology.ts` / `publisher.ts` / `consumer.ts`
- `services/rabbitmq-lab-service/src/labs/hello/`
- `services/rabbitmq-lab-service/src/http/`

## Student guide

[LEARN.md](./LEARN.md)

## Developer guide

[DEVELOPER.md](./DEVELOPER.md)

## Testing

[TESTING.md](./TESTING.md)

## Operations

[OPERATIONS.md](./OPERATIONS.md)
