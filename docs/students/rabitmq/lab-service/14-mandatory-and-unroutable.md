# Lesson 14 — Mandatory and Unroutable

## Status

**CURRENT VERIFIED**

## 1. Goal

See that a confirmed publish can still be silently unroutable — unless you
opt in to `mandatory: true`.

## 2. What problem are we solving?

Publisher confirms (Lesson 13) prove the broker received the message. They
do **not** prove it reached a queue. If nothing is bound to the routing key
you used, RabbitMQ still confirms the publish — and then simply discards
the message. `mandatory: true` turns that silent discard into an observable
`basic.return` event instead.

## 3. Mental model

```text
SUCCESS = confirmed AND routable

publish(mandatory=false, unroutable key) → confirmed, silently dropped
publish(mandatory=true,  unroutable key) → confirmed, AND returned to you (basic.return)
```

## 4. Diagram

```text
POST /api/lab/confirms {"routingKey":"no.queue.matches.this","mandatory":true}
     │
     ▼
confirmChannel.publish(...) → broker confirms the publish
     │
     ▼ (no binding matches "no.queue.matches.this")
confirmChannel 'return' event fires → recorded in confirms.returned
```

## 5. RabbitMQ terminology

`mandatory` flag, `basic.return`, unroutable message.

## 6. Existing code example

```45:48:services/rabbitmq-lab-service/src/labs/confirms/index.ts
  // Only fires when mandatory=true AND the message was unroutable (Lesson 14).
  confirmChannel.on('return', (msg: Message) => {
    returnedHistory.record({ routingKey: msg.fields.routingKey, payload: safeParseJson(msg.content) });
  });
```

## 7. Exercise

Publish with a routing key that has no binding, once without `mandatory`
and once with it, and compare what you can observe in each case.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/confirms `
  -H "Content-Type: application/json" -d '{"routingKey":"no.queue.matches.this","mandatory":false}'
curl -X POST http://localhost:4011/api/lab/confirms `
  -H "Content-Type: application/json" -d '{"routingKey":"no.queue.matches.this","mandatory":true}'
```

## 10. What you should observe

Both requests return `202 confirmed: true`. Only the second call adds an
entry to `confirms.returned` in `GET /api/lab/status` — the first message
is gone with no trace anywhere.

## 11. RabbitMQ Management UI steps

Nothing to see for the unroutable message itself (it's discarded before it
would appear in any queue) — this is exactly the point of the exercise.

## 12. Logs you should see

None — `basic.return` handling here only updates in-memory state, checked
via `/api/lab/status`.

## 13. Expected queue state

`student.rabbitmq-lab.confirms.q` is unaffected either way — the unroutable
message never reaches it.

## 14. Failure exercise

This lesson *is* the failure exercise — the first publish above **is** the
silent-failure case. Compare it side-by-side with the `mandatory: true` one
to internalize the difference.

## 15. Cleanup/reset

None needed — no queue state changes for unroutable messages.

## 16. Questions

1. Why isn't `mandatory: true` the default for every publish?
2. If `confirmed: true` doesn't guarantee routability, what two checks would
   a fully safe publisher need to make?

## 17. How CRM uses this concept

Not implemented in current CRM services — a real-world use would be
`outbox-publisher` verifying that a routing key from `contracts/events/`
actually has a live binding before marking an outbox row `published`.

## 18. Production note

CRM rule to remember: **success = confirmed AND routable**. Neither
guarantee alone is sufficient for "this event definitely reached its
consumers."

## Next

Lesson "TTL" — see [START-HERE.md](./START-HERE.md#implementation-order)
(LAB-06).
