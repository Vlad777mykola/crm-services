# Local Development

## Current status

**CURRENT VERIFIED** — commands from `docker/dev/compose.infra.yml` and `env/dev/common.env`.

---

## Start RabbitMQ

```powershell
# From repo root
docker compose -f docker/dev/compose.infra.yml --profile events up -d rabbitmq
```

**Expected:** Container healthy; ports 5672 and 15672 listening.

---

## Stop / restart

```powershell
docker compose -f docker/dev/compose.infra.yml --profile events stop rabbitmq
docker compose -f docker/dev/compose.infra.yml --profile events restart rabbitmq
```

---

## Management UI

- URL: http://localhost:15672
- User: `crm`
- Password: `crm_local_only`
- Vhost: `crm-dev`

---

## AMQP connection

From `env/dev/common.env`:

```text
RABBITMQ_URL=amqp://crm:crm_local_only@localhost:5672/crm-dev
```

Services read `RABBITMQ_URL` from their `.env` (see each service's `.env.example`).

---

## Start messaging stack

Typically combined with services compose — see `docker/dev/README.md`:

```powershell
docker compose -f docker/dev/compose.infra.yml --profile events --profile python-workers up -d
docker compose -f docker/dev/compose.services.yml up -d
```

(Exact compose files may vary; verify in `docker/dev/README.md`.)

---

## Verify connection

1. Open Management UI → Connections tab while a consumer service runs
2. Check service health endpoint (RabbitMQ dependency in readiness)
3. `node scripts/dev/verify-env.mjs`

---

## Inspect queues

Management UI → Queues → select `crm-dev` vhost → e.g. `users-service.q`

---

## Reproduce broker outage

```powershell
docker compose -f docker/dev/compose.infra.yml --profile events stop rabbitmq
```

**Expected:** Consumer services log reconnect attempts; readiness may fail; outbox rows stay `pending`.

Restart broker and observe catch-up.

---

## Reset application queues

```powershell
node scripts/messaging/cli.mjs
# or see scripts/state/lib/messaging-reset.mjs
```

**Warning:** Destructive — dev only.

---

## Concepts to distinguish

| Term | Meaning |
| ---- | ------- |
| RabbitMQ container | Broker process in Docker |
| Exchange | Routing layer (`domain.events`) |
| Queue | Buffer per consumer (`users-service.q`) |
| Vhost | Isolated namespace (`crm-dev`) |
| outbox-publisher | App that reads DB, not part of RabbitMQ |
| Consumer | App service reading from its queue |

---

## Next

[10-testing.md](./10-testing.md)
