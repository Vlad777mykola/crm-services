# Lesson 07 — Publish/Subscribe (Fanout)

## Status

**CURRENT VERIFIED**

## 1. Goal

See one message reach every subscriber, instead of exactly one worker.

## 2. What problem are we solving?

A work queue splits jobs across workers (Lesson 06 — not written yet). A
fanout exchange does the opposite: it broadcasts. RabbitMQ's own tutorials
draw exactly this distinction between work queues and publish/subscribe.

## 3. Mental model

```text
publish → student.rabbitmq-lab.fanout (fanout exchange, ignores routing key)
              ├── student.rabbitmq-lab.fanout.a.q
              └── student.rabbitmq-lab.fanout.b.q
```

Both queues get every message — not one-or-the-other.

## 4. Diagram

```text
POST /api/lab/fanout
     │
     ▼
publishToStudentExchange(channel, STUDENT_FANOUT_EXCHANGE, '', payload)
     │
     ├──► fanout.a.q
     └──► fanout.b.q
```

## 5. RabbitMQ terminology

Fanout exchange, broadcast, routing key is ignored.

## 6. Existing code example

```1:38:services/rabbitmq-lab-service/src/labs/fanout/index.ts
export const FANOUT_QUEUES = {
  a: studentName('fanout', 'a', 'q'),
  b: studentName('fanout', 'b', 'q'),
} as const;
...
export async function initFanoutLab(ch: Channel): Promise<void> {
  ...
    await bindStudentQueue(ch, queue, STUDENT_FANOUT_EXCHANGE, '');
```

## 7. Exercise

Publish once, confirm both queues received it.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/fanout `
  -H "Content-Type: application/json" -d '{"payload":{"note":"broadcast"}}'
```

## 10. What you should observe

`GET /api/lab/status` → `fanout.a.received` and `fanout.b.received` both
contain the message.

## 11. RabbitMQ Management UI steps

Exchanges → `student.rabbitmq-lab.fanout` → Bindings tab: two queues bound
with an empty routing key.

## 12. Logs you should see

No dedicated log line for fanout today — check `/api/lab/status` instead.

## 13. Expected queue state

Both `fanout.a.q` and `fanout.b.q` return to `Ready: 0` after each publish.

## 14. Failure exercise

Delete one binding manually via the Management UI, republish, and observe
only one queue now receives the message.

## 15. Cleanup/reset

Purge `student.rabbitmq-lab.fanout.a.q` / `.b.q` from the Management UI.

## 16. Questions

1. Why is the routing key ignored for a fanout exchange?
2. How is this different from a work queue with two competing workers?

## 17. How CRM uses this concept

CRM does not use a fanout exchange directly — `domain.events` is a topic
exchange bound with `#` by `metrics-service`, which achieves the same
"everyone gets everything" effect while still allowing other consumers to
bind selectively. See [docs/students/rabitmq/README.md](../README.md) §8.

## 18. Production note

Fanout is simple but inflexible — a topic exchange with `#` gives you
fanout's behavior plus the option for other consumers to be selective later,
which is why CRM standardized on topic exchanges everywhere.

## Next

[08-direct-routing.md](./08-direct-routing.md)
