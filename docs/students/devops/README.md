# DevOps guide — how it all works

## Current status

**CURRENT VERIFIED** — reflects `package.json`, `scripts/`, and `docker/` layout as of this repo.

---

## Who should read this

You are a **student** learning how to run, test, and deploy this monorepo. Read this file first, then follow the step-by-step paths in each environment folder.

| Step | Read | Do |
| ---- | ---- | -- |
| 1 | This file (concepts) | Understand what depends on what |
| 2 | [dev/RUN.md](./dev/RUN.md) | Get local dev working |
| 3 | [dev/DEBUG.md](./dev/DEBUG.md) | Fix dev problems |
| 4 | [test/RUN.md](./test/RUN.md) | Run automated tests |
| 5 | [test/DEBUG.md](./test/DEBUG.md) | Fix test failures |
| 6 | [prod/RUN.md](./prod/RUN.md) | Deploy or smoke prod |
| 7 | [prod/DEPLOY-STRATEGY.md](./prod/DEPLOY-STRATEGY.md) | Understand prod architecture |
| 8 | [prod/DEBUG.md](./prod/DEBUG.md) | Fix prod problems |

For RabbitMQ and events (cross-cutting): [../rabitmq/README.md](../rabitmq/README.md).

---

## What you are operating

This repo is a **monorepo**:

```text
crm-services/
├── frontend/           React + Vite (browser UI)
├── services/           Microservices (auth, companies, …)
├── contracts/events/   Shared event schemas (not runtime code)
├── docker/             Compose stacks (dev / test / verify / prod / smoke)
├── scripts/            Orchestration (dev, test, db, verify, smoke)
└── db/                 Migrations and seeds
```

**Important rule:** services talk to each other through **RabbitMQ events**, not by importing each other's source code. Node consumers share **`@crm/messaging-kit`** for connection lifecycle and retry helpers only — not business logic.

---

## The five environments (why they exist)

Each environment has **its own ports** so dev, tests, and CI never fight over Postgres or the gateway.

| Environment | When you use it | Docker project | Postgres port |
| ----------- | --------------- | -------------- | ------------- |
| **Dev** | Daily coding on your machine | `dev` | `:5432` |
| **Test** | `yarn test:integration` / `test:e2e` | `crm-test` | `:15432` |
| **Verify** | `yarn verify:startup` (CI gate) | `crm-verify` | `:25432` |
| **Smoke** | `yarn smoke:prod` (Dockerfile check) | `crm-smoke` | `:35432` |
| **Prod** | Real deployment on a server | (compose default) | internal only |

**Why this matters:** if integration tests used dev Postgres (`:5432`), they could wipe your local data or fail because dev services are already running. Isolation is intentional.

---

## Dependency map — what must run before what

```text
                    ┌─────────────────────────────────────┐
                    │  Docker infra (dev/test/prod)       │
                    │  Postgres · RabbitMQ · Traefik      │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        db:migrate            Gateway :8080      RabbitMQ vhost
        (schemas exist)       routes HTTP        (queues exist)
              │                    │                    │
              ▼                    ▼                    ▼
        Domain services      Frontend :5173       Outbox publishers
        (auth, companies…)   calls gateway        (read outbox_events
              │              not services         → publish to Rabbit)
              └────────────────────┬────────────────────┘
                                   ▼
                          Consumers (users-service,
                          notifications-service, …)
```

### Layer 1 — Infrastructure (always first in dev)

| Component | Role | Dev port |
| --------- | ---- | -------- |
| **Postgres** | All service data + outbox tables | `:5432` |
| **RabbitMQ** | Async events between services | `:5672` (AMQP), `:15672` (UI) |
| **Traefik** | Single API entry; routes `/auth/*`, `/companies/*`, … | `:8080` |
| **Redis** | Reserved (not used by app code yet) | internal |

**Command:** `yarn dev:infra` or auto-started by `yarn dev`.

### Layer 2 — Database structure

| Component | Role |
| --------- | ---- |
| **Migrations** (`yarn db:migrate`) | Creates schemas (`auth_schema`, `companies_schema`, …) |
| **Seed** (`yarn db:seed:*`) | Fills test users, companies, appointments |

Services **fail readiness** if their schema or DB is missing. Migrate before (or use `--fresh`).

### Layer 3 — Domain services

Each service owns one bounded context:

| Service | Port | Needs |
| ------- | ---- | ----- |
| auth | 4001 | Postgres, RabbitMQ (publish) |
| users | 4002 | Postgres, RabbitMQ (consume auth events) |
| companies | 4003 | Postgres |
| … | 4004–4010 | Postgres ± RabbitMQ |

### Layer 4 — Outbox publishers (one per publishing schema)

When a service writes a domain event, it goes to `outbox_events` in the **same DB transaction**. A separate **outbox-publisher** process reads that table and publishes to RabbitMQ.

| Outbox | Health port | Schema |
| ------ | ----------- | ------ |
| auth | 4501 | `auth_schema` |
| companies | 4503 | `companies_schema` |
| … | 4504–4509 | … |

**Why separate process:** the HTTP handler must not talk to RabbitMQ directly — that would break transactional guarantees.

**Rule:** if events don't flow, check that the matching outbox publisher is running.

### Layer 5 — Frontend

| Component | Port | Config |
| --------- | ---- | ------ |
| Vite dev server | `:5173` | `VITE_API_URL=http://localhost:8080` |

Browser → frontend → **gateway** → service on host. Never point the browser at `:4003` directly in dev.

---

## Dev vs test vs prod — key differences

| Aspect | Dev | Test | Prod |
| ------ | --- | ---- | ---- |
| Where services run | Host (`tsx watch`) | Script-spawned or Docker | Containers only |
| Hot reload | Yes | No | No |
| Data | Your local DB; seeds optional | Disposable; torn down after test | Persistent; real secrets |
| Gateway | `:8080` → `host.docker.internal` | `:18080` | `:80` (only public port) |
| Env files | `services/*/.env` | Injected by test scripts | `services/*/.env.production` |
| Goal | Fast feedback while coding | Prove behavior in isolation | Stable, secure deployment |

---

## One-time machine setup (all environments)

From repo root:

```powershell
cd D:\projects\crm-services
yarn install
yarn dev check
```

**Expected:**

```text
✓ Node v22.x.x
✓ dependencies installed
✓ Docker available
```

Copy `.env` for each service you will start:

```powershell
copy services\auth-service\.env.example services\auth-service\.env
# repeat per service — see dev/RUN.md
```

---

## Learning path (recommended order)

### Week 1 — Dev basics

1. Read this file (concepts above).
2. Follow [dev/RUN.md](./dev/RUN.md) → `yarn dev` (minimal).
3. Hit health endpoints; open UI and gateway.
4. When something breaks → [dev/DEBUG.md](./dev/DEBUG.md).

### Week 2 — Full stack + events

1. `yarn dev full --fresh` ([dev/RUN.md](./dev/RUN.md)).
2. Read [../rabitmq/README.md](../rabitmq/README.md) — understand outbox flow.
3. Practice incremental startup (one layer at a time).

### Week 3 — Tests

1. [test/RUN.md](./test/RUN.md) — unit → integration → e2e.
2. [test/DEBUG.md](./test/DEBUG.md) when CI would fail.

### Week 4 — Prod mindset

1. [prod/DEPLOY-STRATEGY.md](./prod/DEPLOY-STRATEGY.md) — architecture and secrets.
2. `yarn smoke:prod` then [prod/RUN.md](./prod/RUN.md).
3. [prod/DEBUG.md](./prod/DEBUG.md) for deployment issues.

---

## Build commands (all environments)

| Command | What it builds |
| ------- | -------------- |
| `yarn build` | Frontend only (`tsc` + Vite → `frontend/dist/`) |
| `cd services/X && yarn build` | One service (`tsc` → `dist/`) |
| `docker build -f services/X/Dockerfile …` | Production container image |

Dev uses `tsx watch` — no build step needed while coding.

---

## CI pipeline (what runs on every PR)

From `.github/workflows/repo-ci.yml`:

1. `yarn lint` + `yarn typecheck`
2. `yarn test:unit`
3. `yarn test:integration`
4. `yarn test:e2e`
5. `yarn verify:startup`
6. Build companies-service prod image (separate job)

Run the same locally before opening a PR — see [test/RUN.md](./test/RUN.md).

---

## Quick decision tree

```text
Need to…                          → Go to
─────────────────────────────────────────────────────
Code locally                        → dev/RUN.md
Fix local startup                   → dev/DEBUG.md
Run unit tests                      → test/RUN.md (yarn test)
Run integration/E2E                 → test/RUN.md
Fix failing tests                   → test/DEBUG.md
Understand prod layout              → prod/DEPLOY-STRATEGY.md
Deploy or smoke prod                → prod/RUN.md
Fix prod deployment                 → prod/DEBUG.md
Understand events / RabbitMQ        → ../rabitmq/README.md
```

---

## Source-of-truth files in the repo

| Topic | Repo path |
| ----- | --------- |
| Dev orchestration | `scripts/dev/run.mjs`, `scripts/dev/features.mjs` |
| Port numbers | `scripts/dev/port-registry.mjs` |
| Test stack | `scripts/test/stack.mjs`, `docker/test/compose.yml` |
| Prod compose | `docker/prod/compose.yml` |
| DB migrate/seed | `scripts/db/`, `scripts/fill_dump_db/` |
| Gateway routes | `docker/dev/traefik/dynamic.host.yml` (dev), `docker/prod/traefik/dynamic.yml` (prod) |

---

## Folder index

| Folder | Files |
| ------ | ----- |
| [dev/](./dev/) | [RUN.md](./dev/RUN.md) · [DEBUG.md](./dev/DEBUG.md) |
| [test/](./test/) | [RUN.md](./test/RUN.md) · [DEBUG.md](./test/DEBUG.md) |
| [prod/](./prod/) | [RUN.md](./prod/RUN.md) · [DEBUG.md](./prod/DEBUG.md) · [DEPLOY-STRATEGY.md](./prod/DEPLOY-STRATEGY.md) |
