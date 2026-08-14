# Lesson 10 — Headers Exchange

## Status

**CURRENT VERIFIED** — educational only, see the production note below.

## 1. Goal

See routing based on message headers instead of a routing key.

## 2. What problem are we solving?

Sometimes routing criteria don't fit naturally into a dotted routing key
(e.g. "urgent AND pdf" vs "urgent OR pdf"). Headers exchanges route on
arbitrary key/value message headers with `x-match=all` or `x-match=any`.

## 3. Mental model

```text
x-match=all → every listed header must match (AND)
x-match=any → at least one listed header must match (OR)
```

## 4. Diagram

```text
student.rabbitmq-lab.headers (headers exchange)
  ├─ x-match=all { format: pdf, urgent: true } → headers.all.q
  └─ x-match=any { format: pdf, urgent: true } → headers.any.q

publish headers={format: pdf, urgent: true}  → all.q, any.q
publish headers={format: pdf, urgent: false} → any.q only
publish headers={format: doc, urgent: false} → neither
```

## 5. RabbitMQ terminology

Headers exchange, `x-match`, header-based binding (routing key ignored).

## 6. Existing code example

```1:30:services/rabbitmq-lab-service/src/labs/headers/index.ts
const CRITERIA = { format: 'pdf', urgent: true } as const;
...
await bindStudentQueue(ch, HEADERS_QUEUES.all, STUDENT_HEADERS_EXCHANGE, '', { 'x-match': 'all', ...CRITERIA });
...
await bindStudentQueue(ch, HEADERS_QUEUES.any, STUDENT_HEADERS_EXCHANGE, '', { 'x-match': 'any', ...CRITERIA });
```

## 7. Exercise

Publish three messages with different header combinations and predict which
queue(s) receive each.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/headers `
  -H "Content-Type: application/json" `
  -d '{"headers":{"format":"pdf","urgent":true},"payload":{}}'
curl -X POST http://localhost:4011/api/lab/headers `
  -H "Content-Type: application/json" `
  -d '{"headers":{"format":"pdf","urgent":false},"payload":{}}'
```

## 10. What you should observe

First publish → both `headers.all.received` and `headers.any.received`.
Second publish → only `headers.any.received`.

## 11. RabbitMQ Management UI steps

Exchanges → `student.rabbitmq-lab.headers` → Bindings tab — note `x-match`
in the binding arguments, and that the routing key column is empty.

## 12. Logs you should see

Check `/api/lab/status` — no dedicated log line.

## 13. Expected queue state

Matching queues blip to `Ready: 1` then back to `0`.

## 14. Failure exercise

Publish with no `headers` at all (`{}`) — expect neither queue to receive it
(no criteria match).

## 15. Cleanup/reset

Purge `headers.all.q` / `headers.any.q` from the Management UI.

## 16. Questions

1. Why does the headers exchange ignore the routing key entirely?
2. When would `x-match=any` be the wrong choice compared to `x-match=all`?

## 17. How CRM uses this concept

It doesn't. The current CRM event model uses topic routing exclusively.

## 18. Production note

The current CRM event model uses topic routing. **Headers exchange is
educational and should not be introduced into CRM without a concrete
requirement** — dotted routing keys plus `contracts/events/` schemas already
cover every real routing need documented in
[docs/students/rabitmq/README.md](../README.md).

## Next

Lesson "ACK/NACK/reject" — see
[START-HERE.md](./START-HERE.md#implementation-order) (LAB-04).
