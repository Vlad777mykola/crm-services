# auth-service — Operations Guide

## Development

| Resource | Value |
| -------- | ----- |
| Queue | `auth-service.q` |
| Dead queue | `auth.dead.q` |
| Exchange | `domain.events` |
| Outbox schema | `auth_schema` |
| Publisher | `outbox-publisher-auth` |

Check depth: Management UI → `auth-service.q`, `auth.dead.q`.

Readiness: fails when RabbitMQ unreachable (`src/http/health.routes.ts`).

## Production

Managed RabbitMQ, TLS, secrets. Monitor `auth-service.q` depth and `auth.dead.q` growth. Alert on outbox `failed` rows in `auth_schema.outbox_events`.

**TARGET RFC1 (implemented in runtime):** retry/parking queues per `messaging-kit` naming; readiness via `isReady()`. See [common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md).
