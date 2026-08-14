# RabbitMQ Lab Service — Start Here

## Status

**CURRENT VERIFIED** for what is implemented (LAB-01/LAB-02 below).
Everything else in this file is a **planned syllabus**, not yet built —
each lesson file states its own status at the top.

## What this is

`services/rabbitmq-lab-service` is a **real but isolated** microservice.
It uses the exact same engineering patterns as the rest of this repo
(connection/channel lifecycle, guarded topology helpers, manual ACK,
readiness checks, `yarn dev:<name>`) so what you learn here transfers
directly to `companies-service`, `appointments-service`, etc. It is **not**
a toy disconnected from the project, and it is **never deployed to
production** — see [29-production-rules.md](./29-production-rules.md).

```text
Learn RabbitMQ fundamentals
        ↓
practice RabbitMQ operations
        ↓
learn reliable messaging patterns
        ↓
observe real companies-service events
        ↓
learn CRM messaging conventions
        ↓
be ready to work on real microservices
```

## Quick start

```powershell
# Terminal 1
yarn dev:infra

# Terminal 2 (optional but recommended — real CRM flow to observe later)
yarn dev:companies

# Terminal 3
yarn dev:rabbitmq-lab
```

```powershell
curl http://localhost:4011/health/ready
curl http://localhost:4011/api/lab/status
curl -X POST http://localhost:4011/api/lab/hello -H "Content-Type: application/json" -d "{\"message\":\"hi\"}"
```

Ports come from the repo's real registry
([docs/architecture/service-port-registry.md](../../../architecture/service-port-registry.md))
and `scripts/dev/bundles.mjs` — `rabbitmq-lab-service` is `:4011`, right after
`dashboard-service` (`:4010`), not a made-up port.

```text
Frontend
   │ HTTP through gateway
   ▼
companies-service
   │ outbox
   ▼
RabbitMQ
   ├──────────────► real CRM consumers
   └──────────────► RabbitMQ Lab observer (its own queue — never steals messages)
```

## Hard safety boundary

Every exercise runs against this rule (enforced in code, not just by
convention — see `services/rabbitmq-lab-service/src/rabbitmq/names.ts`):

```text
LAB WRITES
→ student.rabbitmq-lab.* only

LAB READS
→ student.rabbitmq-lab.*
→ optionally real domain.events / analytics.events for observation
```

Examples of student-namespaced topology:

```text
student.rabbitmq-lab.direct
student.rabbitmq-lab.topic
student.rabbitmq-lab.fanout
student.rabbitmq-lab.headers

student.rabbitmq-lab.hello.q
student.rabbitmq-lab.work.q
student.rabbitmq-lab.retry.5s.q
student.rabbitmq-lab.parking.q
```

The lab may **subscribe to** real `domain.events` / `company.*` using its own
observer queue, but must never publish fake `company.created` /
`company.updated` / `company.deleted` into the real CRM domain exchange.
`assertStudentName()` and `assertObservableExchange()` throw if any lab code
tries to break this rule — see
`services/rabbitmq-lab-service/tests/unit/names.test.ts` and
`yarn check:rabbitmq-lab`.

## Every lesson follows the same 18-part format

1. Goal · 2. Problem · 3. Mental model · 4. Diagram · 5. Terminology
6. Existing code example · 7. Exercise · 8. Start commands · 9. Publish action
10. What you should observe · 11. Management UI steps · 12. Logs you should see
13. Expected queue state · 14. Failure exercise · 15. Cleanup/reset
16. Questions · 17. How CRM uses this concept · 18. Production note

## Lesson index

| # | Lesson | Status |
| - | ------ | ------ |
| 01 | [Setup](./01-setup.md) | **Written** |
| 02 | RabbitMQ mental model | Planned |
| 03 | Connections and channels | Planned (code exists — `src/rabbitmq/connection.ts`, `channel.ts`) |
| 04 | Queues, exchanges, bindings | Planned |
| 05 | [Publish and subscribe (default exchange / hello lab)](./05-publish-and-subscribe.md) | **Written** |
| 06 | [Work queues](./06-work-queues.md) | **Written** |
| 07 | [Publish/subscribe (fanout)](./07-publish-subscribe.md) | **Written** |
| 08 | [Direct routing](./08-direct-routing.md) | **Written** |
| 09 | [Topic routing](./09-topic-routing.md) | **Written** |
| 10 | [Headers routing](./10-headers-routing.md) | **Written** |
| 11 | [ACK/NACK/reject](./11-ack-nack-reject.md) | **Written** |
| 12 | [Prefetch and workers](./12-prefetch-and-workers.md) | **Written** |
| 13 | [Publisher confirms](./13-publisher-confirms.md) | **Written** |
| 14 | [Mandatory and unroutable](./14-mandatory-and-unroutable.md) | **Written** |
| 15 | Retry / DLX / TTL | **Written** (`POST /api/lab/failure`, `POST /api/lab/retry`) |
| 16 | Parking and replay | **Written** (retry lab parking tier; replay conceptual) |
| 17 | Idempotency | **Written** (`POST /api/lab/idempotency`, `rabbitmq_lab_schema`) |
| 18 | Transactional outbox | **Written** (`POST /api/lab/order`, lab outbox publisher) |
| 19 | RPC | **Written** (`POST /api/lab/rpc`) |
| 20 | Connections and recovery | **Written** (`src/rabbitmq/connection.ts`, `/health/ready`) |
| 21 | Management UI | Planned (see [29-production-rules.md](./29-production-rules.md) §11) |
| 22 | DevOps management | Planned |
| 23 | Testing RabbitMQ | **Written** (`tests/unit/`, `tests/integration/`) |
| 24 | Failure labs | **Written** (DLQ + retry labs) |
| 25 | [Real companies flow](./25-real-companies-flow.md) | **Written** |
| 26 | Add a new event | Planned (see common docs) |
| 27 | Add a new consumer | Planned (see common docs) |
| 28 | Add a new service | Planned (see common docs) |
| 29 | [Production rules](./29-production-rules.md) | **Written** |
| 30 | [RabbitMQ vs Kafka](./30-rabbitmq-vs-kafka.md) | **Written** |

## Implementation order (do not build everything in one PR)

| Phase | Scope | Status |
| ----- | ----- | ------ |
| LAB-01 | Service skeleton, env, health endpoints, dev command, gateway route, basic connection, this doc | **Done** |
| LAB-02 | Basic messaging: default exchange, publish, consume, ACK (`labs/hello`) | **Done** |
| LAB-03 | Routing: direct, topic, fanout, headers | **Done** (`labs/direct`, `labs/topic`, `labs/fanout`, `labs/headers`) |
| LAB-04 | Consumers: work queue, prefetch, ACK/NACK/reject, consumer cancel | **Done** (`labs/work-queue`) |
| LAB-05 | Publishing reliability: confirm channel, mandatory, `basic.return`, connection recovery | **Done** |
| LAB-06 | Failure architecture: TTL, DLX, retry, parking, replay | **Done** |
| LAB-07 | Database reliability: `rabbitmq_lab_schema`, inbox, outbox | **Done** |
| LAB-08 | Companies integration: read-only `company.*` observer | **Done** |
| LAB-09 | Student UI: `/student/rabbitmq` | **Done** |
| LAB-10 | DevOps: Management UI exercises | Partial (lesson 22 planned) |
| LAB-11 | Production/Kafka education | **Done** (lessons 29, 30) |
| LAB-12 | Guardrails + graduation checklist | **Done** (`yarn check:rabbitmq-lab`, [GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md)) |

## Related

- Service docs: [docs/students/rabitmq/services/rabbitmq-lab-service/](../services/rabbitmq-lab-service/README.md)
- Graduation: [GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md)
- Repo-wide messaging overview: [docs/students/rabitmq/README.md](../README.md)
- Verified per-service matrix: [SERVICES.md](../SERVICES.md)
