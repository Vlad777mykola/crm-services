# Dev — how to debug

## Current status

**CURRENT VERIFIED** — common local dev failure modes and fixes.

**Before debugging:** confirm [RUN.md](./RUN.md) steps completed (`yarn dev check`, infra up, correct feature).

---

## Debug mindset

1. **Stop at the first failing layer** — don't start `full` if auth chain isn't healthy.
2. **Check readiness before UI** — `/health/ready` tells you if DB/Rabbit are OK.
3. **Events need outbox** — HTTP service + matching outbox publisher must both run.
4. **Seed profile matters** — `companies` seed ≠ `full` seed.

Recommended order:

```text
infra → migrate → service → outbox → consumer → frontend
```

---

## Symptom → cause → fix

| Symptom | Likely cause | What to do |
| ------- | ------------ | ---------- |
| `/health/ready` → 503 | Postgres or RabbitMQ down | `docker compose -f docker/dev/compose.infra.yml ps`; restart `yarn dev:infra` |
| `/health/ready` timeout | Service still starting or crashed | Read service terminal output |
| Port already in use | Old process | `yarn dev status` → `yarn dev stop` or `yarn dev stop --force-ports` |
| Port in use but not healthy | Zombie / wrong app | `yarn dev stop --force-ports`, retry |
| `yarn dev check` fails Node | Wrong Node version | Node ≥ 22.13 |
| `yarn dev check` fails Docker | Docker Desktop off | Start Docker Desktop |
| Events not flowing | Outbox publisher missing | Start matching outbox (auth→4501, companies→4503, …) |
| Outbox waits forever | Owning service not started | Service creates schema on boot — start service first |
| Register works, no user profile | users-service or outbox-auth down | Check :4002 and :4501 readiness; RabbitMQ UI for `users-service.q` |
| Booking "Service not found" | Wrong seed or missing projections | `yarn db:seed:full:reset --target dev` |
| Empty specialists list | `companies` seed only | Use `full` seed or `yarn dev full --fresh` |
| Seed fails mid-way | Schema/seed code mismatch | Fix seed, then `yarn dev full --fresh` |
| Frontend blank / API errors | Wrong `VITE_API_URL` | Must be `http://localhost:8080`; restart via `yarn dev` |
| Gateway 404 | Service not running or wrong route | Check service port + `docker/dev/traefik/dynamic.host.yml` |
| JWT / 401 errors | Token from different secret | Match `JWT_ACCESS_SECRET` in auth and consuming services `.env` |
| Consumer errors in logs | Handler exception or bad message | Service logs + RabbitMQ queue depth |
| DLQ growing | Repeated handler failures | `yarn messaging:dlq:list`; inspect dead queue in UI :15672 |

---

## Step-by-step debug procedure

### 1. Check prerequisites

```powershell
yarn dev check
yarn dev status
docker compose -f docker/dev/compose.infra.yml -f docker/dev/compose.gateway.yml ps
```

All infra containers should be **healthy**.

### 2. Check gateway

```powershell
curl http://localhost:8080/ping
```

- **Fails** → Traefik not running → `yarn dev:infra`
- **OK** → gateway up; problem is downstream

### 3. Check the failing service directly

```powershell
curl http://localhost:4003/health/ready   # replace port
curl http://localhost:4003/health/live
```

| Response | Meaning |
| -------- | ------- |
| 200 on `/health/ready` | Service + dependencies OK |
| 503 on `/health/ready` | DB or Rabbit unreachable |
| Connection refused | Service not running |

### 4. Check database

```powershell
yarn db:migrate --target dev
```

Connect to Postgres (`localhost:5432`, db `crm`, user `postgres`/`postgres`) and verify schema exists (e.g. `companies_schema.companies`).

### 5. Check RabbitMQ

Open **http://localhost:15672** (`crm` / `crm_local_only`, vhost `crm-dev`).

| What to look for | Healthy sign |
| ---------------- | ------------ |
| Connections | Active connections from running services |
| Queues | Consumer count ≥ 1 on service queues |
| Messages | Not growing unbounded without consumers |
| Dead letters | Empty or investigated |

```powershell
yarn messaging:dlq:list
```

### 6. Check outbox chain

For event flow (e.g. auth → users):

```powershell
curl http://localhost:4001/health/ready   # publisher writes outbox
curl http://localhost:4501/health/ready   # outbox publisher
curl http://localhost:4002/health/ready   # consumer
```

If outbox is down, events sit in `auth_schema.outbox_events` until publisher runs.

### 7. Reset to known-good state

```powershell
yarn dev stop --force-ports
yarn dev full --fresh
```

If seed fails, read the `[fill_dump_db]` error — fix schema/seed, retry.

---

## Seed profile debugging

| Profile | Companies | Specialists | Services | Appointments |
| ------- | --------- | ----------- | -------- | ------------ |
| `companies` / `companies:reset` | 2 published | ❌ | ❌ | ❌ |
| `full` / `full:reset` | 4 | ✅ | ✅ | ✅ |

**Booking needs `full`.** Symptom: "Service not found" with only companies seed.

Optional SQL sanity check (psql on `crm`):

```sql
SELECT name, status FROM services_schema.services WHERE status = 'published';
SELECT * FROM appointments_schema.appointment_service_projection;
```

Projection tables empty after `full:reset` → old seed code; re-run `yarn db:seed:full:reset --target dev`.

---

## Port conflict debugging

```powershell
yarn dev status
netstat -ano | findstr :4003
```

After `yarn dev stop --force-ports`, retry startup.

---

## Logs — where to look

| Source | Where |
| ------ | ----- |
| Service you started | Terminal where `yarn dev` / `yarn dev svc` runs |
| Docker infra | `docker compose -f docker/dev/compose.infra.yml logs postgres` |
| Gateway | `docker compose -f docker/dev/compose.gateway.yml logs gateway` |
| RabbitMQ | Management UI → Queues → get messages |

---

## How to update after fixing

| You changed… | Do this |
| ------------ | ------- |
| TypeScript service code | Save — `tsx watch` reloads |
| DB schema (migrations) | `yarn db:migrate --target dev`, restart service |
| Seed data | `yarn db:seed:full:reset --target dev` |
| npm dependency | `yarn install` at root |
| Gateway route | Edit `docker/dev/traefik/dynamic.host.yml`, restart gateway container |
| Event contract | `yarn ci:validate-events` |

---

## Messaging-specific debug

```powershell
yarn ci:validate-events
yarn workspace @crm/outbox-publisher test
yarn test:messaging
```

Integration test against dev Postgres:

```powershell
$env:USERS_INTEGRATION_TEST="1"
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/crm"
yarn workspace @crm/users-service test
```

Deep dive: [../../rabitmq/common/11-debugging.md](../../rabitmq/common/11-debugging.md).

---

## Still stuck?

Capture and share:

1. Output of `yarn dev check`
2. Output of `yarn dev status`
3. Which command you ran (`yarn dev full --fresh`, etc.)
4. First failing `curl …/health/ready`
5. Relevant service terminal error (last 20 lines)

---

## Related

- [RUN.md](./RUN.md) — how to start dev
- [../README.md](../README.md) — dependency map
- [../../rabitmq/README.md](../../rabitmq/README.md) — events
