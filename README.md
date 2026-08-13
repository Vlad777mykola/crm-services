# CRM Services

Monorepo with a **React frontend** and **independently deployable microservices**
behind a Traefik gateway. Services communicate through versioned event schemas
(`contracts/events/`) — never through direct source imports from other deploy
units.

## Structure

```
crm-services/
├── frontend/              # React + Vite (Yarn workspace)
├── contracts/events/      # shared event JSON schemas
├── services/              # auth, users, companies, …, dashboard, ai, workers
├── docker/                # local dev + interim prod Compose stacks
├── scripts/               # dev orchestration, verify, test, smoke, seeds
│   ├── dev/               # `yarn dev <feature>`
│   ├── verify/            # `yarn verify:startup`
│   ├── test/              # `yarn test:integration` / `test:e2e`
│   └── fill_dump_db/      # `yarn db:migrate` / `yarn db:seed`
└── docs/architecture/     # extraction checklist, routing, ownership
```

Yarn workspaces: `frontend`, `services/*`, `scripts/fill_dump_db`.

## Getting started

Requires **Node.js >= 22.13** and **Docker** (for Postgres, RabbitMQ, Traefik).

```bash
yarn install              # all workspaces
yarn dev                  # default: companies (frontend + companies-service)
# or: yarn dev dashboard --fresh
```

Infra starts automatically. Manual infra only: `yarn dev:infra` (Postgres `:5432`, gateway `:8080`).

Gateway: `http://localhost:8080` · Frontend: `http://localhost:5173`

See [`scripts/dev/README.md`](scripts/dev/README.md) for features, `yarn dev stop`, and DB commands.

### Database (migrate / dump / seed)

```bash
yarn db:migrate
yarn db:dump && yarn db:restore    # fast dev reset from snapshot
yarn db:seed:full:reset             # or explicit seed profiles
```

Profiles: `db:seed:companies`, `db:seed:full`, `db:seed:test`. See [`scripts/db/README.md`](scripts/db/README.md).

## Root scripts

| Script | Purpose |
|---|---|
| `yarn dev` / `yarn dev <feature>` | Intent-based local dev |
| `yarn dev list` | Features and dependencies |
| `yarn verify:startup` | Isolated startup gate (CI) |
| `yarn test` | Unit tests (frontend + services) |
| `yarn test:integration` | Isolated integration stack |
| `yarn test:e2e` | E2E smoke on test ports |
| `yarn smoke:prod` | Prod Dockerfile smoke |
| `yarn build/lint/typecheck` | Frontend |

## Architecture docs

- [`docs/architecture/microservices-extraction-checklist.md`](docs/architecture/microservices-extraction-checklist.md)
- [`docs/architecture/dev-orchestration.md`](docs/architecture/dev-orchestration.md)
- [`docs/architecture/gateway-routing.md`](docs/architecture/gateway-routing.md)
- [`scripts/README.md`](scripts/README.md) — dev, verify, test, smoke
- [`docker/dev/README.md`](docker/dev/README.md)
