# rabbitmq-lab-service — Student Guide

## Status

**CURRENT VERIFIED**

## What does this service do?

Nothing business-related — it is a dedicated, safe place to learn RabbitMQ
by running real code against a real broker, using the same patterns the CRM
uses elsewhere in this repo. Full syllabus:
[docs/students/rabitmq/lab-service/START-HERE.md](../../lab-service/START-HERE.md).

## Why does it participate in messaging?

Because RabbitMQ is the subject. Unlike every other service in
[SERVICES.md](../../SERVICES.md), it has no business domain of its own.

## Events it publishes

None into real CRM exchanges — see [EVENTS.md](./EVENTS.md). It publishes
lab-only messages into its own `student.rabbitmq-lab.*` namespace.

## Events it consumes

Its own lab messages today (`student.rabbitmq-lab.hello.q`). Later phases add
a read-only observer binding to real `domain.events` / `company.*` — see
LAB-08 in [START-HERE.md](../../lab-service/START-HERE.md#implementation-order).

## Follow one message

1. `POST /api/lab/hello {"message": "hi"}`
2. `src/http/routes/lab.routes.ts` → `publishHello()`
3. `src/labs/hello/index.ts` → `publishToDefaultExchange(channel, HELLO_QUEUE, ...)`
4. RabbitMQ delivers it back to `student.rabbitmq-lab.hello.q`
5. `consumeStudentQueue`'s handler records it in memory
6. `GET /api/lab/status` shows it under `hello.received`

## Duplicate delivery

Not applicable yet — the hello lab has no idempotency layer (LAB-07 is not
implemented). If you publish the same message twice, it appears twice.

## Failure example

If the handler in `src/labs/hello/index.ts` throws, `consumeStudentQueue`
(`src/rabbitmq/consumer.ts`) NACKs without requeue — the message is dropped,
not retried immediately. See
[05-publish-and-subscribe.md](../../lab-service/05-publish-and-subscribe.md)
§14.

## Exercise 1

Find `HELLO_QUEUE` in code and confirm it matches what you see in the
RabbitMQ Management UI (http://localhost:15672).

## Exercise 2

Try calling `publishToDefaultExchange` (or any `assert*` helper) with a name
that does **not** start with `student.rabbitmq-lab.` — read the error in
`src/rabbitmq/names.ts` and explain, in your own words, why it exists.

## Questions to test your understanding

1. Why does this service have no outbox table?
2. What decides whether `/health/ready` returns 200 or 503?
3. Where exactly is it guaranteed that this service can never publish into
   `domain.events`?

## Where to look in code next

- `services/rabbitmq-lab-service/src/rabbitmq/names.ts`
- `services/rabbitmq-lab-service/src/labs/hello/index.ts`
- [docs/students/rabitmq/lab-service/START-HERE.md](../../lab-service/START-HERE.md)
