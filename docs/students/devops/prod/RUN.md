# Prod — how to run

## Current status

**TARGET / SCAFFOLD** — `docker/prod/compose.yml` exists but is **not yet verified on a live host**. Use `yarn smoke:prod` first to validate Dockerfile builds.

**Prerequisites:**

1. [../README.md](../README.md) — understand dependencies
2. [DEPLOY-STRATEGY.md](./DEPLOY-STRATEGY.md) — architecture and secrets
3. Local dev working ([../dev/RUN.md](../dev/RUN.md))

---

## Prod vs dev — what changes

| Aspect | Dev | Prod |
| ------ | --- | ---- |
| Services run on | Host (`tsx watch`) | Docker containers |
| Public port | `:8080` (gateway) | `:80` (gateway only) |
| DB hostname in URL | `localhost` | `postgres` (Compose service name) |
| Env files | `services/*/.env` | `services/*/.env.production` |
| Secrets | Example defaults OK | Real secrets required |
| Hot reload | Yes | No — rebuild image |

---

## Step 1 — smoke before full prod

**Goal:** Verify production Dockerfile builds and API responds — without full prod env setup.

```powershell
yarn smoke:prod
```

**Flow:**

1. Build `companies-service` image from `services/companies-service/Dockerfile`
2. Start minimal stack (Postgres `:35432`, gateway `:38080`)
3. Migrate + seed companies
4. `GET http://localhost:38080/companies/public`
5. Teardown

**Success:** `[smoke:prod] passed`

**If smoke fails** → [DEBUG.md](./DEBUG.md#smoke-prod).

---

## Step 2 — prepare production env files

**Never commit real `.env.production` files.**

Copy examples (from repo root):

```powershell
copy docker\prod\.env.production.example docker\prod\.env.production
copy services\auth-service\.env.example services\auth-service\.env.production
copy services\users-service\.env.example services\users-service\.env.production
copy services\companies-service\.env.example services\companies-service\.env.production
copy services\outbox-publisher\.env.example services\outbox-publisher\.env.production
copy services\outbox-publisher\.env.example services\outbox-publisher\.env.production.auth
copy services\outbox-publisher\.env.example services\outbox-publisher\.env.production.companies
# … full list in docker/prod/README.md
```

**Critical edits in every `.env.production`:**

| Variable | Dev value | Prod value |
| -------- | --------- | ---------- |
| `DATABASE_URL` host | `localhost` | `postgres` |
| `RABBITMQ_URL` host | `localhost` | `rabbitmq` |
| `JWT_ACCESS_SECRET` | example | **same strong secret everywhere** |
| Passwords | `postgres` / `crm_local_only` | **real secrets** |

See [DEPLOY-STRATEGY.md](./DEPLOY-STRATEGY.md) for outbox env file pattern.

---

## Step 3 — build and start full stack

```powershell
docker compose -f docker/prod/compose.yml up -d --build
```

**What starts:**

- Traefik gateway (only service with host port **80**)
- All domain services + outbox publishers
- Postgres, Redis, RabbitMQ, postgres-ai
- Legacy backend (routes not yet extracted)

**Wait for healthy:**

```powershell
docker compose -f docker/prod/compose.yml ps
```

All services should show running/healthy.

---

## Step 4 — database setup (first deploy)

On first deploy, run migrations against prod Postgres:

```powershell
# Example — adjust for your migration runner / one-off container
docker compose -f docker/prod/compose.yml exec postgres psql -U postgres -c "\l"
```

Use your team's migration process (`yarn db:migrate --target …` against prod URL, or init container). Prod target config is in `scripts/db/`.

**Do not** run `db:reset` against production.

---

## Step 5 — smoke checks

Replace `localhost` with your server IP if remote:

```powershell
curl http://localhost/health
curl http://localhost/health/ready
curl http://localhost/companies/public
curl http://localhost/auth/me
```

| Endpoint | Expected |
| -------- | -------- |
| `/health` | 200 |
| `/health/ready` | 200 when all backends ready |
| `/companies/public` | JSON array of companies |
| `/auth/me` | **401** without token (normal) |

---

## Step 6 — view logs

```powershell
docker compose -f docker/prod/compose.yml logs -f gateway
docker compose -f docker/prod/compose.yml logs -f companies-service
docker compose -f docker/prod/compose.yml logs -f outbox-publisher-auth
```

Follow logs during first deploy to catch startup errors early.

---

## Step 7 — update a single service

After code change:

```powershell
docker compose -f docker/prod/compose.yml up -d --build companies-service
```

Only rebuilds/restarts that service (and dependencies if compose defines them).

---

## Step 8 — stop

```powershell
docker compose -f docker/prod/compose.yml down
```

Add `-v` only if you intend to **destroy volumes** (data loss).

---

## Build individual prod image (without full stack)

```powershell
docker build -f services/companies-service/Dockerfile -t crm-companies-service services/companies-service
docker build -f frontend/Dockerfile -t crm-frontend .
```

Service Dockerfiles use multi-stage: `yarn build` → `node dist/main.js`.

---

## Frontend in production

Primary deploy path for frontend is **GitHub Pages** (see `frontend/Dockerfile` comment), not the prod compose stack. The prod compose may include a frontend container for parity — check `docker/prod/compose.yml` for current state.

---

## When something breaks

→ [DEBUG.md](./DEBUG.md)

---

## Related repo docs

- [../../../docker/prod/README.md](../../../docker/prod/README.md)
- [../../../scripts/smoke/README.md](../../../scripts/smoke/README.md)
- [DEPLOY-STRATEGY.md](./DEPLOY-STRATEGY.md)
- [../README.md](../README.md)
