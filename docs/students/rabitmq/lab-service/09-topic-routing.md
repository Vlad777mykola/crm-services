# Lesson 09 — Topic Exchange

## Status

**CURRENT VERIFIED**

## 1. Goal

Understand how one exchange routes messages using wildcard patterns — the
exact mechanism the real `domain.events` exchange uses.

## 2. What problem are we solving?

Direct routing only matches exact keys. Real event types are dotted
(`company.created`, `appointment.requested`) and consumers often want "all
events of this kind" or "everything" — that needs pattern matching.

## 3. Mental model

```text
*  matches exactly one dot-separated segment
#  matches zero or more segments
```

## 4. Diagram

```text
student.rabbitmq-lab.topic (topic exchange)
  ├─ "company.*"   → topic.company.q
  ├─ "*.created"    → topic.created.q
  └─ "#"            → topic.all.q

publish "company.created" → company.q, created.q, all.q
publish "appointment.created" → created.q, all.q
publish "company.updated" → company.q, all.q
```

## 5. RabbitMQ terminology

Topic exchange, `*` (one segment), `#` (zero-or-more segments), pattern
binding.

## 6. Existing code example

```1:26:services/rabbitmq-lab-service/src/labs/topic/index.ts
export const TOPIC_BINDINGS: TopicBinding[] = [
  { name: 'company', queue: studentName('topic', 'company', 'q'), pattern: 'company.*' },
  { name: 'created', queue: studentName('topic', 'created', 'q'), pattern: '*.created' },
  { name: 'all', queue: studentName('topic', 'all', 'q'), pattern: '#' },
];
```

## 7. Exercise

Publish `company.created`, `company.updated`, `appointment.created` one at a
time and predict which queues receive each **before** checking
`/api/lab/status`.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/topic `
  -H "Content-Type: application/json" -d '{"routingKey":"company.created","payload":{}}'
curl -X POST http://localhost:4011/api/lab/topic `
  -H "Content-Type: application/json" -d '{"routingKey":"appointment.created","payload":{}}'
```

## 10. What you should observe

```text
company.created:    company.q, created.q, all.q
appointment.created: created.q, all.q
company.updated:    company.q, all.q
```

## 11. RabbitMQ Management UI steps

Exchanges → `student.rabbitmq-lab.topic` → Bindings tab — compare the three
patterns to what you predicted.

## 12. Logs you should see

Check `/api/lab/status` — no dedicated log line.

## 13. Expected queue state

Each matching queue blips to `Ready: 1` then back to `0`; non-matching
queues stay at `0` the whole time.

## 14. Failure exercise

Publish with an empty routing key (`""`) and check which queues still match
(`#` always matches, including zero segments; `company.*` and `*.created`
do not).

## 15. Cleanup/reset

Purge the three `topic.*.q` queues from the Management UI.

## 16. Questions

1. Which lab queue is equivalent to what `metrics-service` does on
   `domain.events`?
2. Would `company.*` match `company.member.added`? Why or why not (segment
   counting)?

## 17. How CRM uses this concept

`domain.events` and `analytics.events` are exactly this pattern, at real
scale — see [docs/students/rabitmq/README.md](../README.md) §8–§11 and
[common/07-routing-topology.md](../common/07-routing-topology.md) for every
real binding in the repository.

## 18. Production note

Real services bind only to the event patterns they actually need — binding
to `#` everywhere (like `metrics-service` does, deliberately, as an
observer) means every consumer sees every message, which does not scale for
a business consumer that only cares about one event type.

## Next

[10-headers-routing.md](./10-headers-routing.md)
