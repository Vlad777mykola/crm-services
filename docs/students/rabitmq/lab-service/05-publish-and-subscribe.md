# Lesson 05 — Publish and Subscribe (Default Exchange / "Hello" Lab)

## Status

**CURRENT VERIFIED**

## 1. Goal

Publish one JSON message and see the same process consume it, using the
default (nameless) exchange.

## 2. What problem are we solving?

Every RabbitMQ tutorial starts with "hello world" for a reason: it is the
smallest possible unit — one queue, no exchange declaration, one publish,
one long-lived consumer — before any routing concepts are introduced.

## 3. Mental model

```text
application
  → channel.publish("", queueName, payload)   // exchange = "" (default)
  → RabbitMQ routes it to the queue whose name equals the routing key
  → channel.consume(queueName, handler)        // long-lived subscription
```

## 4. Diagram

```text
POST /api/lab/hello
     │
     ▼
publishToDefaultExchange(channel, HELLO_QUEUE, payload)
     │  exchange="", routingKey=HELLO_QUEUE
     ▼
student.rabbitmq-lab.hello.q
     │
     ▼
consumeStudentQueue(...) handler → recorded in-memory → visible at
GET /api/lab/status
```

## 5. RabbitMQ terminology

- **Default exchange** — every broker has one built in, name `""`
- **Routing key = queue name** — the only rule for the default exchange
- **`basic.consume`** — long-lived subscription (the *normal* application
  pattern — see Lesson 10 in the syllabus, [START-HERE.md](./START-HERE.md))

## 6. Existing code example

```1:33:services/rabbitmq-lab-service/src/labs/hello/index.ts
export const HELLO_QUEUE = studentName('hello.q');
...
export async function initHelloLab(channel: Channel): Promise<void> {
  await assertStudentQueue(channel, HELLO_QUEUE, { durable: true });
  publishChannel = channel;
  await consumeStudentQueue(channel, HELLO_QUEUE, async (parsedBody) => {
    ...
  });
}
```

```27:34:services/rabbitmq-lab-service/src/rabbitmq/publisher.ts
export function publishToDefaultExchange(channel: Channel, queue: string, payload: unknown): boolean {
  assertStudentName(queue, 'queue');
  const content = Buffer.from(JSON.stringify(payload));
  return channel.publish('', queue, content, { contentType: 'application/json' });
}
```

## 7. Exercise

With `yarn dev:rabbitmq-lab` running, publish a message and read it back.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/hello `
  -H "Content-Type: application/json" `
  -d '{"message":"hello from lesson 05"}'
```

## 10. What you should observe

```powershell
curl http://localhost:4011/api/lab/status
```

`hello.received[0].message` is `"hello from lesson 05"`.

## 11. RabbitMQ Management UI steps

1. Open http://localhost:15672 (user `crm`, password `crm_local_only`, vhost `crm-dev`)
2. Queues → find `student.rabbitmq-lab.hello.q`
3. Publish a message there directly from the UI (routing key not needed —
   you're publishing straight to the queue's "Publish message" tab, which
   bypasses exchange routing entirely) and re-check `/api/lab/status`

## 12. Logs you should see

```text
[rabbitmq-lab-service] hello lab received message
```

## 13. Expected queue state

`student.rabbitmq-lab.hello.q`: `Ready` returns to `0` almost immediately —
`prefetch(1)` + a fast handler mean nothing piles up in normal operation.

## 14. Failure exercise

Temporarily throw inside the handler (edit
`src/labs/hello/index.ts` locally) and republish. Because
`consumeStudentQueue` NACKs without requeue on handler failure (see
`src/rabbitmq/consumer.ts`), the message is dropped, not retried forever —
this is deliberate: an immediate `nack(requeue=true)` loop is exactly the
poison-message trap covered later in the retry/DLX lessons.

## 15. Cleanup/reset

```powershell
# Management UI → Queues → student.rabbitmq-lab.hello.q → Purge
```

Only ever purge `student.rabbitmq-lab.*` queues — never any real service's
own queue.

## 16. Questions

1. Why does the default exchange require `routingKey === queue name`?
2. What would happen if you called `publishToDefaultExchange` with a queue
   name that isn't under `student.rabbitmq-lab.*`? Why?
3. Why is `consumeStudentQueue`'s NACK `requeue=false` and not `true`?

## 17. How CRM uses this concept

CRM services never use the default exchange for business messaging — every
real service declares a named topic exchange (`domain.events` /
`analytics.events`) instead, so multiple independent consumers can bind to
the same fact. See [docs/students/rabitmq/README.md](../README.md) §8–§10.

## 18. Production note

`assertStudentQueue()` and `publishToDefaultExchange()` both refuse any name
outside `student.rabbitmq-lab.*` (see `src/rabbitmq/names.ts`) — this lab can
never accidentally declare or publish into a real CRM queue, even by typo.

## Next

Lesson 06 (work queues) — not written yet, see
[START-HERE.md](./START-HERE.md#implementation-order).
