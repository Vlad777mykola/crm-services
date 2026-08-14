# Student graduation checklist

A student is ready for real CRM messaging work when they can explain and demonstrate every item below.

Use [START-HERE.md](./START-HERE.md) lessons and `yarn dev:rabbitmq-lab` hands-on exercises.

## Fundamentals

- [ ] connection vs channel
- [ ] exchange vs queue
- [ ] binding
- [ ] routing key
- [ ] direct exchange (`POST /api/lab/direct`)
- [ ] topic exchange (`POST /api/lab/topic`, compare with `domain.events`)
- [ ] fanout exchange (`POST /api/lab/fanout`)
- [ ] headers exchange (`POST /api/lab/headers`)
- [ ] publish (`POST /api/lab/hello`, routing labs)
- [ ] subscribe/consume (long-lived `basic.consume` in every lab)
- [ ] work queue (`POST /api/lab/work`)
- [ ] competing consumer (two workers A/B in work-queue lab)
- [ ] ACK / NACK / reject (`failMode` on work jobs)
- [ ] requeue trap (`failMode: nack-requeue` — know why CRM avoids this)
- [ ] prefetch (`GET /api/lab/work/peek` vs long-lived consumers)
- [ ] publisher confirm (`POST /api/lab/confirms`)
- [ ] mandatory/unroutable (`mandatory: true` on confirms lab)
- [ ] durable queue/message (Management UI on `student.rabbitmq-lab.*`)

## Failure architecture

- [ ] TTL (retry tier queues use `x-message-ttl`)
- [ ] DLX (`POST /api/lab/failure` → dead queue)
- [ ] retry tiers (`POST /api/lab/retry`)
- [ ] parking (retry lab `failUntilAttempt`)
- [ ] replay (inspect parking, fix cause, reprocess — conceptual until replay API added)

## Database reliability

- [ ] duplicate delivery (`POST /api/lab/idempotency` twice with same `eventId`)
- [ ] `processed_events` (`rabbitmq_lab_schema`)
- [ ] transactional inbox (rollback exercise with `failAfterMark: true`)
- [ ] transactional outbox (`POST /api/lab/order` + outbox publisher)

## Operations

- [ ] reconnect (`/health/ready` flips on broker outage)
- [ ] Management UI (http://localhost:15672)
- [ ] RabbitMQ diagnostics (conceptual — see lesson 22)
- [ ] safe reset (`POST /api/lab/reset` — student queues only)

## Real CRM bridge

- [ ] real `company.created` flow (create company in frontend, observe in `/api/lab/status` → `companiesObserver`)
- [ ] event contracts (`contracts/events/company.created.v1.json`)
- [ ] correlationId / causationId (envelope fields)
- [ ] why RabbitMQ is at-least-once
- [ ] why domain services should not publish directly (outbox lesson)
- [ ] RabbitMQ vs Kafka (lesson 30)

## Safety rules (must articulate)

- [ ] lab writes only to `student.rabbitmq-lab.*`
- [ ] lab never publishes fake `company.*` into `domain.events`
- [ ] lab observer uses its own queue, never `companies-service.q`
- [ ] `yarn check:rabbitmq-lab` passes
