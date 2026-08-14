# rabbitmq-lab-service — Events Reference

## Status

**CURRENT VERIFIED**

No generic RabbitMQ teaching here — exact service messaging contract only.
This service publishes/consumes **lab-only** messages, not CRM domain
events, so there is no `contracts/events/*.v1.json` schema for them (that
contract-first rule applies to real domain facts — see
[docs/students/rabitmq/common/04-event-contracts.md](../../common/04-event-contracts.md)).

## Published events

| Field | Value |
| ----- | ----- |
| Event | `{ message: string, sentAt: string }` (lab-only, not a CRM domain event type) |
| Direction | publish |
| Exchange | default (`""`) |
| Routing key | `student.rabbitmq-lab.hello.q` (must equal the queue name — default-exchange rule) |
| Contract | none — lab-only payload, no `contracts/events/` schema |
| Created by | `POST /api/lab/hello` → `src/labs/hello/index.ts#publishHello` |
| Outbox | none |
| Consumers | this service's own `student.rabbitmq-lab.hello.q` consumer |

## Consumed events

| Field | Value |
| ----- | ----- |
| Event | its own hello messages |
| Direction | consume |
| Queue | `student.rabbitmq-lab.hello.q` |
| Binding | default exchange, routing key = queue name |
| Handler | `src/labs/hello/index.ts#initHelloLab` |
| DB effect | none (in-memory, capped at last 20 messages) |
| Idempotency | none |
| Failure path | NACK without requeue (dropped, not parked — no DLX yet) |

## Planned (not implemented)

Read-only observation of real `company.*` events on `domain.events` —
LAB-08, see
[docs/students/rabitmq/lab-service/START-HERE.md](../../lab-service/START-HERE.md#implementation-order).
That binding will appear here, with the real event's own contract cited
(from `contracts/events/company.created.v1.json` etc.), once implemented.
