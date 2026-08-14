# Lesson 01 — Setup

## Status

**CURRENT VERIFIED**

## 1. Goal

Get `rabbitmq-lab-service` running next to a real CRM service and confirm
both are healthy.

## 2. What problem are we solving?

You need a safe place to break things on purpose. This lesson only proves
the environment works before any RabbitMQ concepts are introduced.

## 3. Mental model

Same shape as every other service in this repo: infra in Docker, services on
the host via `yarn dev:<name>`, all HTTP through the Traefik gateway.

## 4. Diagram

```text
Terminal 1: yarn dev:infra        → Postgres, RabbitMQ, Traefik (Docker)
Terminal 2: yarn dev:companies    → companies-service + frontend (real CRM)
Terminal 3: yarn dev:rabbitmq-lab → rabbitmq-lab-service :4011 (this lab)
```

## 5. RabbitMQ terminology

None yet — this lesson is pure environment setup.

## 6. Existing code example

- `services/rabbitmq-lab-service/src/env.ts` — reads `RABBITMQ_URL`, `PORT` (default `4011`), `LOG_LEVEL`
- `services/rabbitmq-lab-service/src/main.ts` — bootstraps the connection and the HTTP server
- `scripts/dev/bundles.mjs` → `SERVICES['rabbitmq-lab']` — port `4011`, registered like every other service, not a made-up value

## 7. Exercise

Start all three terminals above, in order.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:companies
yarn dev:rabbitmq-lab
```

## 9. Publish action

None yet.

## 10. What you should observe

Three processes running: infra containers, `companies-service` (+frontend),
`rabbitmq-lab-service`.

## 11. RabbitMQ Management UI steps

Open http://localhost:15672 (user `crm`, password `crm_local_only`, vhost
`crm-dev`). Confirm the broker is up — no lab-specific state to check yet.

## 12. Logs you should see

```text
[rabbitmq-lab-service] HTTP server listening on :4011 (...)
[rabbitmq-lab-service] ready - writes only to student.rabbitmq-lab.* (Ctrl+C to stop)
```

## 13. Expected queue state

`student.rabbitmq-lab.hello.q` exists (declared by `labs/hello` on connect) —
see Lesson 05.

## 14. Failure exercise

Stop `yarn dev:infra` (Ctrl+C in that terminal) and watch
`rabbitmq-lab-service`'s logs report a disconnect, then
`curl http://localhost:4011/health/ready` return `503`.

## 15. Cleanup/reset

`Ctrl+C` in each terminal. No destructive reset needed for this lesson.

## 16. Questions

1. What port does `rabbitmq-lab-service` use, and where is that decided?
2. What's the difference between `/health/live` and `/health/ready` right now?

## 17. How CRM uses this concept

Every real service (`companies-service`, `appointments-service`, ...) follows
this exact `yarn dev:<name>` + `/health/live` + `/health/ready` convention —
see [docs/students/rabitmq/common/09-local-development.md](../common/09-local-development.md).

## 18. Production note

`rabbitmq-lab-service` is dev/student-only and is intentionally **not**
wired into `docker/dev/compose.services.yml` or any `docker/prod/*.yml` — see
[29-production-rules.md](./29-production-rules.md).

## Next

[05-publish-and-subscribe.md](./05-publish-and-subscribe.md)
