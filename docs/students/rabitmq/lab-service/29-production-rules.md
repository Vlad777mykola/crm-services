# Lesson 29 — Production Rules

## Status

**CURRENT VERIFIED** for what applies to this lab today; the rest documents
targets for real CRM services (cross-referenced, not re-invented here).

## 1. Goal

Understand exactly why `rabbitmq-lab-service` itself must never run in
production, and which production rules it still teaches.

## 2. What problem are we solving?

Local RabbitMQ and production RabbitMQ are not identical. Without saying
this explicitly, students may assume "it worked on my machine" is enough.

## 3. Mental model

```text
rabbitmq-lab-service
❌ NOT deployed to production
✅ teaches the rules real services must follow in production
```

## 4. Diagram

```text
docker/dev/compose.services.yml   → no rabbitmq-lab-service entry
docker/prod/*.yml                 → no rabbitmq-lab-service entry
docker/dev/traefik/dynamic.container.yml → no rabbitmq-lab-service entry
docker/dev/traefik/dynamic.host.yml      → rabbitmq-lab-service (host dev loop only)
```

## 5. RabbitMQ terminology

TLS, secrets, least privilege, vhost isolation, durable topology, publisher
confirms, manual acknowledgements, bounded retries, parking queues,
monitoring/alerts.

## 6. Existing code example

```1:12:services/rabbitmq-lab-service/Dockerfile
# syntax=docker/dockerfile:1
#
# STUDENT/DEV-ONLY. This image exists only so the lab can optionally be run
# in a container the same way other services can; it is intentionally NOT
# referenced from docker/dev/compose.services.yml or any docker/prod/*.yml.
```

## 7. Exercise

Grep the repo and confirm the claim yourself:

```powershell
git grep -n "rabbitmq-lab-service" docker/dev/compose.services.yml docker/prod
```

Expect no matches.

## 8. Start commands

None — this is a read-only exercise.

## 9. Publish action

N/A.

## 10. What you should observe

`docker/dev/compose.services.yml` and every `docker/prod/*.yml` never
mention `rabbitmq-lab-service`.

## 11. RabbitMQ Management UI steps

N/A.

## 12. Logs you should see

N/A.

## 13. Expected queue state

N/A.

## 14. Failure exercise

N/A — there is nothing to fail here; that's the point.

## 15. Cleanup/reset

N/A.

## 16. Questions

1. Why keep a Dockerfile at all for a service that's never deployed?
2. Which of the production rules below does `rabbitmq-lab-service` itself
   already follow (durable queues, manual ACK), and which does it
   deliberately skip (TLS, secrets, monitoring)? Why is skipping those safe
   here but not for a real service?

## 17. How CRM uses this concept

Real production rules, targets vs current state:
[docs/students/rabitmq/common/13-production-rules.md](../common/13-production-rules.md).

## 18. Production note

Summary of what a real production RabbitMQ setup needs, that this lab
intentionally does not implement:

- TLS
- Secret-managed credentials (not `crm` / `crm_local_only`)
- Least-privilege users per service
- Separate environments/vhosts
- Durable topology (the lab does declare durable queues/exchanges — same
  pattern, just not production-hardened)
- Publisher confirms + manual acknowledgements (partially implemented —
  manual ACK/NACK exists in `src/rabbitmq/consumer.ts`; publisher confirms
  are a later lesson)
- Bounded retries + parking queues (not implemented yet — see the
  Implementation order table in [START-HERE.md](./START-HERE.md))
- Monitoring and alerts
- No destructive purge/reset outside `student.rabbitmq-lab.*`
- Client reconnect (implemented — `src/rabbitmq/connection.ts`)
- Deliberate queue type selection (classic/quorum/stream)
