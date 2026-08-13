# Local development (`yarn dev`)

Intent-based orchestration: pick a **feature**, tooling resolves services, outboxes, schemas, and infra.

```powershell
yarn dev                    # default: companies (frontend + companies-service)
yarn dev list               # all features
yarn dev dashboard          # auth chain + dashboard + schema bootstrap
yarn dev dashboard --fresh   # reset + migrate + seed
yarn dev dashboard --baseline  # team baseline restore + start
yarn dev companies --no-frontend  # skip UI when :5173 already serving
yarn dev check              # static preflight (Node, deps, Docker)
yarn dev status             # infra + tracked PIDs + ports
yarn dev stop               # tracked PIDs only (safe default)
yarn dev stop --infra       # also stop docker dev infra
```

## Topology

```text
Browser (:5173)  →  Traefik (:8080)  →  host.docker.internal:<service-port>
```

1. **Infra** (auto-started unless `--no-infra`): `yarn dev:infra` — Postgres `:5432`, RabbitMQ, Traefik `:8080`
2. **Feature** resolves dependency graph from `scripts/dev/features.mjs`
3. **Schemas** — features with `schemas[]` run `db:migrate` before services start
4. **`--fresh`** — stop apps, `db:migrate`, `db:reset`, feature seed profile
5. **`--baseline`** — stop apps, `db:baseline:restore`, start (migrate forward inside restore)

If a feature port is already in use **and** healthy (e.g. frontend from `yarn dev dashboard`), dev **reuses** it instead of spawning a duplicate. Use `--no-frontend` to skip starting the UI entirely.

## Features

| Feature | What runs |
|---------|-----------|
| `companies` | frontend + companies-service (default) |
| `companies-members` | frontend + companies + company-members + outbox-companies |
| `auth` | frontend + auth + users + outbox-auth |
| `dashboard` | requires auth + dashboard + cross-schema migrate |
| `core` | auth + companies + dashboard |
| `full` | all 11 domain services + 9 outboxes + frontend |

Legacy: `yarn dev svc auth`, `yarn dev outbox auth`, old bundle names still work.

## Install

Yarn workspaces — one install at repo root:

```powershell
yarn install
# or: yarn install:services  (same — installs all workspaces)
```

Workspaces: `frontend`, `services/*`, `scripts/fill_dump_db`.

## Port map

| Service | Port | Gateway paths |
|---------|------|----------------|
| gateway | 8080 | all API |
| auth | 4001 | `/auth/*` |
| users | 4002 | `/users/*` |
| companies | 4003 | `/companies/*` |
| company-members | 4004 | `/companies/:id/members*` |
| specialists | 4005 | `/specialists/*` |
| company-specialists | 4006 | company specialist routes |
| services-catalog | 4007 | `/services/*` |
| appointments | 4008 | `/appointments/*` |
| reviews | 4009 | review routes |
| notifications | 4300 | `/notifications/*` |
| dashboard | 4010 | `/app/summary` |

Outbox health ports `4501`–`4509`. See `docs/architecture/service-port-registry.md`.

## DB scripts

```powershell
yarn db:migrate --target dev
yarn db:backup / yarn db:restore
yarn db:baseline:pull / yarn db:baseline:restore --target dev
yarn db:seed:companies | db:seed:full | db:seed:test
yarn db:reset --target dev
```

See [`scripts/db/README.md`](scripts/db/README.md).

## Other environments

| Mode | Command | Docs |
|------|---------|------|
| Verify gate | `yarn verify:startup` | `scripts/verify/README.md` |
| Integration | `yarn test:integration` | `scripts/test/README.md` |
| E2E | `yarn test:e2e` | `scripts/test/README.md` |
| Prod smoke | `yarn smoke:prod` | `scripts/smoke/README.md` |
