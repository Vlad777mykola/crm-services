# Local microservice dev

Run extracted services on the **host** (`tsx watch`) while **Traefik** (in Docker)
routes `http://localhost:8080` to `host.docker.internal:<port>` per path.

## First-time setup

Root `yarn install` only installs the **frontend** workspace. Each microservice has
its own `node_modules` — run `yarn install:services` once.

**CORS** is configured at the Traefik gateway only (`docker/traefik/cors/dev.middleware.yml`).
Services do not need a `cors` package or `CORS_ORIGINS` env var.

## How it works

```text
Browser (:5173)  →  Traefik gateway (:8080)  →  host.docker.internal
                                                    ├─ auth-service      :4001  /auth/*
                                                    ├─ users-service     :4002  /users/me, /users/:id
                                                    ├─ companies-service :4003  /companies/*
                                                    └─ … (see service-port-registry.md)
```

1. **Terminal 1** — infra + gateway (always first):

   ```bash
   yarn dev:infra
   ```

   Starts Postgres `:5432`, RabbitMQ `:5672` (`--profile events`), Traefik `:8080`.

2. **Terminal 2** — pick a bundle or single service:

   ```bash
   yarn dev:list              # all bundles + ports
   yarn dev:auth:app          # frontend + auth + users + outbox-auth
   yarn dev:companies         # frontend + companies-service
   yarn dev:svc:auth          # only auth-service (:4001)
   ```

3. Frontend always uses `VITE_API_URL=http://localhost:8080` (set by bundle scripts).
   Paths stay the same as production — only the host is the gateway.

## Port map (host)

| Service | Port | Gateway paths (examples) |
|---|---|---|
| gateway (Traefik) | 8080 | all API traffic |
| auth-service | 4001 | `/auth/*` |
| users-service | 4002 | `/users/me`, `/users/:id` |
| companies-service | 4003 | `/companies/*` |
| company-members-service | 4004 | `/companies/:id/members*` |
| specialists-service | 4005 | `/specialists/*` |
| company-specialists-service | 4006 | `/companies/:id/specialists*` |
| services-catalog-service | 4007 | `/services/*`, `/companies/:id/services*` |
| appointments-service | 4008 | `/appointments/*`, `/companies/:id/appointments*` |
| reviews-service | 4009 | `/companies/:id/reviews`, … |
| notifications-service | 4300 | `/notifications/*` |
| dashboard-service | 4010 | `/app/summary`, `/companies/:id/summary` |

Outbox publishers (publish domain events to RabbitMQ) use health ports `4501`–`4509`
and `OUTBOX_SCHEMA` (e.g. `auth_schema`) — see `service-port-registry.md` and
`services/outbox-publisher/.env.example`.

## Bundles

| Script | What runs | Use for |
|---|---|---|
| `yarn dev:auth` | auth + users + outbox-auth | API-only register/login |
| `yarn dev:auth:app` | + frontend | Login/register in browser |
| `yarn dev:companies` | frontend + companies | `/companies` public list |
| `yarn dev:companies:svc` | companies only | curl via gateway |
| `yarn dev:dashboard:app` | frontend + auth + dashboard | `/app` (`GET /app/summary`) |
| `yarn dev:dashboard` | auth + dashboard (no frontend) | curl `/app/summary` with token |
| `yarn dev:companies-members` | companies + members + outbox-companies | create company + member projection |

## Outbox publishers

Outbox instances **do not create tables** — the owning service creates
`outbox_events` on startup (e.g. `auth-service` creates `auth_schema.outbox_events`).

| Command | Owning service you must also run |
|---|---|
| `yarn dev:outbox:auth` | `yarn dev:svc:auth` (or `yarn dev:auth` bundle) |
| `yarn dev:outbox:companies` | `yarn dev:svc:companies` |

Or use a bundle that starts both:

```bash
yarn dev:auth          # auth + users + outbox-auth (one terminal)
yarn dev:auth:app      # + frontend
```

Standalone outbox in one terminal + owning service in another also works:

```bash
# Terminal 2a
yarn dev:outbox:auth

# Terminal 2b
yarn dev:svc:auth
```

Outbox logs a warning until the table exists, then polls normally.

## Auth + users example (register flow)

Services involved:

1. **auth-service** (`:4001`) — `POST /auth/register` writes identity + outbox row
2. **outbox-auth** (`:4501`) — reads `auth_schema.outbox_events`, publishes to RabbitMQ
3. **users-service** (`:4002`) — consumes `auth.user_registered`, creates `users_schema` profile

```bash
# Terminal 1
yarn dev:infra

# Terminal 2
yarn dev:auth:app
```

Register at http://localhost:5173/register — then `/users/me` should return a profile.

Requires RabbitMQ (`dev:infra` includes `--profile events`).

## First-time setup

`yarn dev:svc:*` and bundles inject local defaults (Postgres, RabbitMQ, JWT secret)
matching `compose.infra.yml` — **no `.env` copy required** for day-to-day dev.

Optional: copy each service's `.env.example` to `.env` if you need custom values.
Those files override the injected defaults when present.

## Seed data

```bash
cd scripts/fill_dump_db && yarn seed:companies    # 2 published companies for /companies/public
```

See [`fill_dump_db/README.md`](../fill_dump_db/README.md).

## Implementation

Bundle definitions live in [`bundles.mjs`](bundles.mjs); the runner is [`run.mjs`](run.mjs).
Root `package.json` scripts call `node scripts/dev/run.mjs …`.
