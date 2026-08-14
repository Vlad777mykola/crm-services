# Prod — deploy strategy

## Current status

**TARGET ARCHITECTURE** — describes intended production shape. Interim deployment uses `docker/prod/`; long-term target is **Kubernetes / AWS EKS** (see `docs/architecture/target-production-architecture.md`).

Read this **before** [RUN.md](./RUN.md) so you understand *why* prod is set up this way.

---

## Why prod is different from dev

| Principle | Reason |
| --------- | ------ |
| **Everything in containers** | Same artifact runs on any server; no "works on my machine" |
| **One public port** | Only Traefik exposes `:80`/`:443`; services are internal |
| **Real secrets** | Example passwords from dev must never reach production |
| **No hot reload** | Stability — deploy known image version, roll back if broken |
| **Persistent data** | Postgres/RabbitMQ volumes or managed services hold state |
| **Health checks** | Orchestrator routes traffic only to ready instances |

---

## Architecture overview

```text
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  Traefik gateway │  :80 (only public port)
              │  (TLS terminate) │
              └────────┬────────┘
                       │ HTTP (internal Docker network)
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
  auth-service   companies-service   … (11 services)
       │               │
       ▼               ▼
  outbox-auth     outbox-companies   … (9 publishers)
       │               │
       └───────┬───────┘
               ▼
         ┌──────────┐      ┌──────────┐
         │ RabbitMQ │      │ Postgres │
         └──────────┘      └──────────┘
               ▲               ▲
               │               │
         consumers         per-schema
    (users, notifications, …)  data + outbox_events
```

---

## Deployment units

Each folder under `services/` is an **independently deployable unit**:

| Unit | Dockerfile | Port (internal) |
| ---- | ---------- | --------------- |
| auth-service | `services/auth-service/Dockerfile` | 4001 |
| companies-service | `services/companies-service/Dockerfile` | 4003 |
| outbox-publisher | `services/outbox-publisher/Dockerfile` | 4500+ (per instance) |
| … | … | see `service-port-registry.md` |

**Same image, different config:** `outbox-publisher` runs multiple times — one per schema (`auth_schema`, `companies_schema`, …) with different `DATABASE_URL` search_path and `HEALTH_PORT`.

---

## Dependency order at deploy time

Infrastructure must be available before apps:

```text
1. Network + volumes
2. Postgres (+ postgres-ai for AI)
3. RabbitMQ
4. Redis (reserved)
5. Run migrations (schemas)
6. Domain services
7. Outbox publishers (after their schema's service has created tables)
8. Gateway (can start earlier, but routes 502 until backends ready)
```

**Why outbox after services:** the owning service creates `outbox_events` table on first boot.

---

## Configuration strategy

### Layer 1 — Compose-level (`docker/prod/.env.production`)

Shared infra credentials referenced by compose services:

- Postgres superuser password
- RabbitMQ default user/password
- Domain name / TLS settings (when configured)

### Layer 2 — Per-service (`services/*/.env.production`)

Each service reads **only its own** env file — never from Compose `environment:` blocks for secrets.

| Must align across services | Why |
| -------------------------- | --- |
| `JWT_ACCESS_SECRET` | Token issued by auth must verify in companies, appointments, … |
| `DATABASE_URL` credentials | Must match what Postgres container expects |
| `RABBITMQ_URL` credentials | Must match RabbitMQ container |

### Layer 3 — Outbox variants

Separate files per outbox instance:

| File | Schema | HEALTH_PORT |
| ---- | ------ | ----------- |
| `.env.production` | default | 4500 |
| `.env.production.auth` | `auth_schema` | 4501 |
| `.env.production.companies` | `companies_schema` | 4503 |
| … | … | … |

`DATABASE_URL` must include `?options=-c%20search_path%3D<schema>`.

---

## Gateway routing strategy

**Single source of routing rules:** path prefixes map to services.

| Path prefix | Service |
| ----------- | ------- |
| `/auth/*` | auth-service |
| `/companies/*` | companies-service (and related) |
| `/users/*` | users-service |
| … | … |

Files:

- Prod: `docker/prod/traefik/dynamic.yml`
- Dev mirror: `docker/dev/traefik/dynamic.host.yml`

**Rule:** when extracting a new service from legacy backend, update **both** dev and prod Traefik configs. See `docs/architecture/gateway-routing.md`.

---

## Image build strategy

### Per-service Dockerfile pattern

```dockerfile
FROM node:22-alpine AS deps → yarn install
FROM deps AS build → yarn build (tsc)
FROM base AS production → copy dist/, yarn install --production
CMD ["node", "dist/main.js"]
```

### When to rebuild

| Change | Action |
| ------ | ------ |
| Service TypeScript code | Rebuild that service image |
| Shared contract (events) | Rebuild publishers/consumers that validate payloads |
| Migration only | Run migrate job — no image rebuild |
| Traefik route | Restart gateway — no app rebuild |

### CI validation

`.github/workflows/repo-ci.yml` builds `companies-service` image on every PR. `yarn smoke:prod` runs a minimal end-to-end check locally.

---

## Data strategy

### Interim (docker/prod)

- Self-hosted Postgres + RabbitMQ in same compose stack
- Named volumes: `postgres-data`, `rabbitmq-data`, etc.

### Target (EKS / managed)

| Component | Replace with |
| --------- | ------------ |
| Postgres | RDS / Aurora |
| RabbitMQ | Amazon MQ / CloudAMQP |
| Redis | ElastiCache |
| Containers | EKS pods from same Dockerfiles |

**Only env URLs change** — no Traefik rule changes for DB swap.

---

## Secrets strategy

| Do | Don't |
| -- | ----- |
| Use `.env.production` locally on server (gitignored) | Commit `.env.production` |
| Use secret manager in cloud (SSM, Vault) | Put secrets in compose YAML |
| Rotate `JWT_ACCESS_SECRET` with coordinated rollout | Change one service's secret alone |
| Strong unique DB passwords | Reuse `postgres`/`crm_local_only` from dev |

---

## Rollout strategy (recommended)

### Phase 1 — Smoke on server

1. `yarn smoke:prod` locally (proves Dockerfile)
2. Deploy minimal stack or single service to staging

### Phase 2 — Full compose (interim prod)

1. Copy and fill all `.env.production` files
2. `docker compose up -d --build`
3. Run migrations
4. Smoke checks ([RUN.md](./RUN.md))
5. Monitor logs 24h

### Phase 3 — Rolling updates

1. `docker compose up -d --build <service>`
2. Wait for `/health/ready`
3. Next service
4. Gateway last (if routing changed)

### Phase 4 — Kubernetes migration

Same images from Dockerfiles → push to registry → EKS manifests. Traefik → Ingress controller.

---

## Notifications and legacy backend

Since Phase 11:

- `IN_PROCESS_NOTIFICATIONS_ENABLED=false` in legacy backend `.env.production`
- notifications-service is the **only** creator of notifications/emails

Leaving legacy enabled → **duplicate notifications** in prod.

---

## Observability (target)

| Signal | Tool |
| ------ | ---- |
| HTTP errors | Gateway + service logs |
| Queue depth | RabbitMQ management / metrics |
| DLQ growth | Alert on sustained insert rate |
| Readiness | `/health/ready` per service |

See `docs/students/rabitmq/common/17-observability.md`.

---

## Security checklist before go-live

- [ ] All `.env.production` filled with non-default secrets
- [ ] `JWT_ACCESS_SECRET` identical on all verifying services
- [ ] Only gateway port published to internet
- [ ] Postgres/RabbitMQ not exposed on host ports
- [ ] TLS configured on gateway (or load balancer in front)
- [ ] `IN_PROCESS_NOTIFICATIONS_ENABLED=false`
- [ ] Migrations applied before traffic
- [ ] Smoke checks pass ([RUN.md](./RUN.md))

---

## Student exercises

1. **Map dependencies:** draw which services need RabbitMQ vs Postgres-only.
2. **Trace one deploy:** follow `companies-service` from Dockerfile → compose service → Traefik route → health check.
3. **Break and fix:** run `yarn smoke:prod`, intentionally break `DATABASE_URL`, observe failure, fix.
4. **Compare env files:** diff `auth-service/.env` vs `.env.production` — list every hostname change.

---

## Related

- [RUN.md](./RUN.md) — step-by-step deploy commands
- [DEBUG.md](./DEBUG.md) — prod troubleshooting
- [../../../docs/architecture/target-production-architecture.md](../../../docs/architecture/target-production-architecture.md)
- [../../../docker/prod/README.md](../../../docker/prod/README.md)
