# rabbitmq-lab-service — Operations Guide

## Status

**CURRENT VERIFIED**

## Development

### Queue names

`student.rabbitmq-lab.hello.q` today. Every future lab adds its own
`student.rabbitmq-lab.*` queue — see
[docs/students/rabitmq/lab-service/START-HERE.md](../../lab-service/START-HERE.md).

### Exchange names

`student.rabbitmq-lab.direct`, `.topic`, `.fanout`, `.headers` (declared,
not yet used by any lab beyond `hello`, which uses the default exchange).

### Routing patterns

Default exchange only so far: routing key must equal queue name.

### How to check queue depth

Management UI: http://localhost:15672 (user `crm`, password
`crm_local_only`, vhost `crm-dev`) → Queues → filter by `student.rabbitmq-lab.`.

### How to identify stuck consumers

Same Queues page → `student.rabbitmq-lab.hello.q` → Consumers tab. There
should be exactly one consumer while `rabbitmq-lab-service` is running.

### Readiness behavior

`/health/live` is always 200 while the process is alive.
`/health/ready` is 200 only once `declareCoreStudentTopology` and
`initHelloLab` have both completed on the current connection; it flips to
503 on disconnect (`setRabbitMqReady(false)` in `src/main.ts`).

### Useful log patterns

```text
[rabbitmq-lab-service] ready - writes only to student.rabbitmq-lab.*
[rabbitmq-lab-service] RabbitMQ disconnected - reconnecting
[rabbitmq-lab-service] hello lab received message
```

### How to inspect a failure

Handler failures log
`[rabbitmq-lab-service] handler failed - nack without requeue` with the
routing key — see `src/rabbitmq/consumer.ts`.

### Dev-only: reset queues

Only ever purge/delete `student.rabbitmq-lab.*` queues, from the Management
UI or `rabbitmqctl`, e.g.:

```powershell
docker compose -f docker/dev/compose.infra.yml exec rabbitmq rabbitmqctl -p crm-dev list_queues name messages
```

`yarn messaging:dlq:list` / `scripts/messaging/cli.mjs` are for real CRM
dead-letter queues — do not point them at lab topology.

## Production

**N/A — this service is never deployed to production.** See
[docs/students/rabitmq/lab-service/29-production-rules.md](../../lab-service/29-production-rules.md).

### Retry / parking queues

**PLANNED — NOT IMPLEMENTED** (LAB-06).

### What should cause an alert

Nothing — no alerting is configured or intended for this service.

### What not to change manually

Anything outside `student.rabbitmq-lab.*` — this service should never need
to touch real CRM topology, and if you find yourself doing so, stop and
re-read [START-HERE.md](../../lab-service/START-HERE.md#hard-safety-boundary).
