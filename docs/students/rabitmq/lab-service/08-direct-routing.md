# Lesson 08 — Direct Exchange

## Status

**CURRENT VERIFIED**

## 1. Goal

Understand exact routing-key matching: a message goes to the queue(s) bound
with that exact key, and nowhere else.

## 2. What problem are we solving?

Fanout can't be selective. Direct routing lets one exchange serve multiple
queues, each interested in exactly one kind of message.

## 3. Mental model

```text
publish key=red → student.rabbitmq-lab.direct → only direct.red.q
```

## 4. Diagram

```text
student.rabbitmq-lab.direct (direct exchange)
  ├─ binding "red"   → student.rabbitmq-lab.direct.red.q
  ├─ binding "blue"  → student.rabbitmq-lab.direct.blue.q
  └─ binding "green" → student.rabbitmq-lab.direct.green.q
```

## 5. RabbitMQ terminology

Direct exchange, exact match, one binding per key.

## 6. Existing code example

```1:23:services/rabbitmq-lab-service/src/labs/direct/index.ts
export const DIRECT_COLORS = ['red', 'blue', 'green'] as const;
...
const queues: Record<DirectColor, string> = {
  red: studentName('direct', 'red', 'q'),
  ...
};
```

## 7. Exercise

Publish to `red` and confirm only `direct.red.q` receives it.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/direct `
  -H "Content-Type: application/json" -d '{"color":"red","payload":{"note":"only red"}}'
```

## 10. What you should observe

`GET /api/lab/status` → `direct.red.received` has the message;
`direct.blue.received` and `direct.green.received` do not.

## 11. RabbitMQ Management UI steps

Exchanges → `student.rabbitmq-lab.direct` → Bindings tab: three bindings,
one routing key each.

## 12. Logs you should see

Check `/api/lab/status` — no dedicated log line.

## 13. Expected queue state

Only the matching queue's `Ready` count blips to 1 then back to 0.

## 14. Failure exercise

`POST /api/lab/direct` with `"color":"purple"` — expect `400` (the route
validates against `DIRECT_COLORS`, since `purple` has no binding and the
message would otherwise be silently dropped by RabbitMQ with no error at
all — that silence is exactly the "unroutable message" trap covered later
in `14-mandatory-and-unroutable.md`).

## 15. Cleanup/reset

Purge the three `direct.*.q` queues from the Management UI.

## 16. Questions

1. What happens (silently) if you publish with a routing key that has no
   binding on a direct exchange?
2. How many queues would receive a message published with key `red` if two
   different queues were both bound to `red`?

## 17. How CRM uses this concept

CRM does not use a direct exchange — every real exchange (`domain.events`,
`analytics.events`, `commands`) is a topic exchange, which is a strict
superset of direct routing (an exact key is just a topic pattern with no
wildcards). See [docs/students/rabitmq/README.md](../README.md) §8.

## 18. Production note

Direct exchanges are fine for simple exact routing, but CRM standardized on
topic exchanges so future consumers can bind with wildcard patterns without
anyone changing the exchange type later.

## Next

[09-topic-routing.md](./09-topic-routing.md)
