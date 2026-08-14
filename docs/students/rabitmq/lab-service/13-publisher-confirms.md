# Lesson 13 — Publisher Confirms

## Status

**CURRENT VERIFIED**

## 1. Goal

See the difference between "`channel.publish()` returned" and "the broker
actually confirmed the message".

## 2. What problem are we solving?

`channel.publish()` on a normal channel returns as soon as the message is
written to the local socket buffer — before the broker has necessarily even
received it, let alone written it to disk. If the connection drops right
after, you cannot tell whether the broker got the message. Publisher
confirms close that gap.

## 3. Mental model

```text
channel.publish() returns true
     → only means "accepted into amqplib's local write buffer"
     → NOT "broker has it"

confirmChannel.publish(..., callback)
     → callback fires only after the broker acks (or nacks) the publish
```

## 4. Diagram

```text
POST /api/lab/confirms
     │
     ▼
confirmChannel.publish(CONFIRMS_EXCHANGE, routingKey, content, opts, cb)
     │                                                              │
     ▼                                                              ▼
RabbitMQ                                                    cb(err) → resolve/reject
```

## 5. RabbitMQ terminology

Publisher confirms, `ConfirmChannel`, ack/nack on the publish itself (not to
be confused with consumer ack/nack).

## 6. Existing code example

```1:20:services/rabbitmq-lab-service/src/labs/confirms/index.ts
export const CONFIRMS_EXCHANGE = studentName('confirms');
export const CONFIRMS_QUEUE = studentName('confirms.q');
...
confirmChannel = await connection.createConfirmChannel();
```

```70:90:services/rabbitmq-lab-service/src/labs/confirms/index.ts
export async function publishWithConfirm(...): Promise<PublishRecord> {
  ...
  const record = await new Promise<PublishRecord>((resolve, reject) => {
    confirmChannel?.publish(CONFIRMS_EXCHANGE, routingKey, content, { ... }, (err) => {
      if (err) { reject(err); return; }
      resolve({ routingKey, mandatory, confirmed: true });
    });
  });
```

## 7. Exercise

Publish with the bound routing key and confirm the promise resolves.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/confirms -H "Content-Type: application/json" -d '{"routingKey":"confirmed"}'
```

## 10. What you should observe

`202` response with `{ "routingKey": "confirmed", "mandatory": false, "confirmed": true }`.
`GET /api/lab/status` → `confirms.published` includes this record and
`confirms.received` includes the message (the queue is bound to
`confirmed`).

## 11. RabbitMQ Management UI steps

Overview page → "Message rates" — publish a few in quick succession and
watch the confirm rate graph move.

## 12. Logs you should see

No dedicated log line — read the HTTP response and `/api/lab/status`.

## 13. Expected queue state

`student.rabbitmq-lab.confirms.q` briefly shows `Ready: 1` then `0`.

## 14. Failure exercise

Stop `yarn dev:infra` mid-experiment (kill the RabbitMQ container) and
immediately `POST /api/lab/confirms` — expect the request to hang or fail
once the connection drops, instead of silently "succeeding" the way a
non-confirm `channel.publish()` would have.

## 15. Cleanup/reset

Purge `student.rabbitmq-lab.confirms.q` from the Management UI.

## 16. Questions

1. What does a `true` return value from plain `channel.publish()` actually
   guarantee, and what does it not guarantee?
2. Why does this lab use a *separate* `ConfirmChannel` instead of turning
   confirms on for the one shared channel used by every other lab?

## 17. How CRM uses this concept

Not implemented in current CRM services yet — this is explicitly the
bridge to the project's outbox-publisher reliability work (RFC1). See
[docs/students/rabitmq/common/18-rfc1-target.md](../common/18-rfc1-target.md).

## 18. Production note

RabbitMQ's own data-safety guidance for quorum queues recommends publisher
confirms plus manual consumer acknowledgements together — confirms alone
only prove the broker received the message, not that a consumer processed
it.

## Next

[14-mandatory-and-unroutable.md](./14-mandatory-and-unroutable.md)
