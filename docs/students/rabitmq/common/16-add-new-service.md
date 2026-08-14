# How to Add Messaging to a New Microservice

## Current status

**CURRENT VERIFIED**

---

## First question

**Does this service actually need asynchronous messaging?**

Not every service needs RabbitMQ. `dashboard-service` is HTTP-only by design.

---

## Decision checklist

| Question | If yes |
| -------- | ------ |
| Does it publish domain facts other services need? | Add outbox + outbox-publisher deployment |
| Does it react to events from other services? | Add consumer + queue + bindings |
| Both? | Outbox + consumer |
| Needs deduplication? | `processed_events` in service schema |
| Which DB schema? | Service-owned schema with outbox/processed tables |
| Which queue? | `{service-name}.q` |
| Health dependency? | Add RabbitMQ to readiness check |

---

## Scaffold steps

1. Create `rabbitmq/topology.ts` and `consumer.ts` (copy from users-service)
2. Add `outbox/outbox-repository.ts` if publishing
3. Add tables to `db/schema.ts`
4. Wire consumer in `main.ts` / `app.ts`
5. Add `RABBITMQ_URL` to `.env.example`
6. Add outbox-publisher service in `docker/dev/compose.services.yml` if publishing
7. Create full documentation folder under `docs/students/rabitmq/services/<service>/`
8. Update [SERVICES.md](../SERVICES.md)

Use [_templates](../_templates/) for documentation files.

---

## Documentation required

All six files: `README.md`, `LEARN.md`, `EVENTS.md`, `DEVELOPER.md`, `TESTING.md`, `OPERATIONS.md`

---

## Next

[17-observability.md](./17-observability.md)
