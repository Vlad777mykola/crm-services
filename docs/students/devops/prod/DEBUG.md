# Prod — how to debug

## Current status

**TARGET / SCAFFOLD** — prod compose is not battle-tested; many issues also appear in `yarn smoke:prod` first.

**Prerequisites:** [DEPLOY-STRATEGY.md](./DEPLOY-STRATEGY.md), [RUN.md](./RUN.md).

---

## Debug mindset for prod

1. **Smoke locally first** — `yarn smoke:prod` catches Dockerfile/build issues before server deploy.
2. **Gateway 502 ≠ app bug** — often means backend not ready or wrong Traefik target.
3. **Hostname matters** — `localhost` in `.env.production` breaks inside containers.
4. **Secrets must match** — `JWT_ACCESS_SECRET` mismatch looks like random 401s.
5. **Never `db:reset` on prod** — use backups and controlled migrations.

---

## Symptom → cause → fix

| Symptom | Likely cause | What to do |
| ------- | ------------ | ---------- |
| Gateway 502 Bad Gateway | Backend down or not ready | `docker compose ps`; check service logs and `/health/ready` inside network |
| Gateway 404 | Route points to wrong service | Compare `docker/prod/traefik/dynamic.yml` with dev `dynamic.host.yml` |
| `/health/ready` 503 | DB or Rabbit unreachable | Verify `DATABASE_URL` / `RABBITMQ_URL` hostnames (`postgres`, `rabbitmq`) |
| Connection refused to postgres | Wrong hostname or Postgres not up | `docker compose logs postgres`; use service name not `localhost` |
| Auth works, other routes 401 | JWT secret mismatch | Align `JWT_ACCESS_SECRET` in all `.env.production` files |
| Duplicate notifications/emails | Legacy in-process notifications on | Set `IN_PROCESS_NOTIFICATIONS_ENABLED=false` in backend |
| Events not flowing | Outbox publisher missing/wrong schema | Check outbox container logs; verify `search_path` in `DATABASE_URL` |
| Outbox unhealthy | Wrong `HEALTH_PORT` or schema | Match port in env to compose `expose` mapping |
| Build fails | TypeScript error or missing dep | Build locally: `cd services/X && yarn build` |
| Container restart loop | Crash on startup | `docker compose logs <service>` — usually env or DB |
| Migrations fail | Schema drift or wrong DB URL | Run migrate against prod URL from one-off container |
| SSL/TLS errors | Cert not configured | Configure Traefik entrypoint or LB in front of gateway |
| Disk full | Logs or Postgres volume | `docker system df`; prune or expand volume |

---

## Smoke prod debug (`yarn smoke:prod`)

### Build failure

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml build companies-service --no-cache
cd services\companies-service
yarn build
```

Fix TypeScript errors before retrying smoke.

### Gateway ping fails

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml ps
docker compose -p crm-smoke -f docker/smoke/compose.yml logs
curl http://localhost:38080/ping
```

Ports: Postgres `:35432`, gateway `:38080`.

### API returns empty companies

Migrate/seed failed on smoke DB:

```powershell
# Check scripts/db/ --target smoke
node scripts/db/migrate.mjs --target smoke
node scripts/db/seed.mjs companies:reset --target smoke
```

### Cleanup stuck smoke stack

```powershell
docker compose -p crm-smoke -f docker/smoke/compose.yml down -v --remove-orphans
```

---

## Full prod stack debug

### Step 1 — container status

```powershell
docker compose -f docker/prod/compose.yml ps
```

| State | Meaning |
| ----- | ------- |
| `running (healthy)` | OK |
| `running` without healthy | Healthcheck failing — read logs |
| `restarting` | Crash loop |
| `exited` | Failed to start |

### Step 2 — logs

```powershell
docker compose -f docker/prod/compose.yml logs -f --tail=100 <service-name>
```

Start with: `gateway`, failing service, `postgres`, `rabbitmq`.

### Step 3 — health from inside network

Exec into a container or use `docker compose run`:

```powershell
docker compose -f docker/prod/compose.yml exec companies-service wget -qO- http://localhost:4003/health/ready
```

From host, only gateway `:80` is exposed — don't curl `:4003` on host unless port-mapped for debug.

### Step 4 — env verification

Inside container:

```powershell
docker compose -f docker/prod/compose.yml exec companies-service env | findstr DATABASE
```

Confirm hostname is `postgres`, not `localhost`.

### Step 5 — database connectivity

```powershell
docker compose -f docker/prod/compose.yml exec postgres psql -U postgres -c "\dt companies_schema.*"
```

No tables → migrations not run.

### Step 6 — RabbitMQ

If compose exposes management port temporarily, or exec into rabbitmq container:

- Connections from services present?
- Queues created with consumers?

---

## JWT / auth debug

**Symptom:** login succeeds but API calls return 401.

**Check:**

1. `JWT_ACCESS_SECRET` identical in `auth-service`, `companies-service`, `appointments-service`, `notifications-service`, …
2. Token not expired
3. Gateway forwards `Authorization` header (Traefik middleware)

**Test:**

```powershell
# Login via gateway, copy token, call protected route
curl -H "Authorization: Bearer <token>" http://localhost/companies/me
```

---

## Outbox debug in prod

Each outbox is a separate container with its own env file.

| Check | Command / action |
| ----- | ---------------- |
| Container running | `docker compose ps \| findstr outbox` |
| Health | Internal `:4501`/etc. `/health/ready` |
| Schema in URL | `search_path=auth_schema` etc. |
| Events stuck | Query `SELECT count(*) FROM auth_schema.outbox_events WHERE published_at IS NULL` |

Publisher logs show publish errors (Rabbit auth, network).

---

## Gateway / Traefik debug

| Issue | Fix |
| ----- | --- |
| Route to dead service | Update `dynamic.yml` `service:` target |
| Wrong path priority | Check `priority:` in router rules |
| CORS in prod | Configure middleware for real frontend origin |

After Traefik config change:

```powershell
docker compose -f docker/prod/compose.yml restart gateway
```

---

## Rollback strategy

### Single service bad deploy

```powershell
# Re-deploy previous image tag if tagged
docker compose -f docker/prod/compose.yml up -d companies-service:<previous-tag>
```

### Full stack bad deploy

```powershell
docker compose -f docker/prod/compose.yml down
# restore DB backup if migration broke data
docker compose -f docker/prod/compose.yml up -d
```

**Practice:** always tag images before deploy (`crm-companies-service:2026-08-14`).

---

## Managed services migration debug

When moving Postgres/RabbitMQ off compose:

| Symptom | Check |
| ------- | ----- |
| SSL required | Add `?sslmode=require` to `DATABASE_URL` |
| Auth failure | New credentials in secret manager |
| Network | Security groups allow app → DB/MQ |
| Vhost mismatch | `RABBITMQ_URL` path matches broker vhost |

No compose file changes needed — only env URLs.

---

## What NOT to do in prod

| Don't | Why |
| ----- | --- |
| `yarn db:reset --target prod` | Destroys all data |
| `docker compose down -v` casually | Deletes volumes |
| Edit running container filesystem | Changes lost on restart |
| Commit `.env.production` | Secret leak |
| Purge RabbitMQ queues without runbook | Lost messages |

---

## Escalation checklist

Capture before asking for help:

1. `docker compose -f docker/prod/compose.yml ps`
2. Last 50 lines: `docker compose … logs <failing-service>`
3. Output of `yarn smoke:prod` (does local smoke pass?)
4. Which step in [RUN.md](./RUN.md) failed
5. Redacted env sample (hostnames only, no passwords)

---

## Related

- [RUN.md](./RUN.md)
- [DEPLOY-STRATEGY.md](./DEPLOY-STRATEGY.md)
- [../test/DEBUG.md](../test/DEBUG.md) — smoke stack overlaps with test debug
- [../../../docker/prod/README.md](../../../docker/prod/README.md)
