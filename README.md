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
├── scripts/
│   ├── dev/               # `yarn dev:*` host runners (gateway bundles)
│   └── fill_dump_db/      # Postgres seed for microservice schemas
└── docs/architecture/     # extraction checklist, routing, ownership
```

Each folder under `services/` has its own `package.json`, `Dockerfile`, and
`.env.example` — not a Yarn workspace member.

## Getting started

Requires **Node.js >= 22.13**.

```bash
yarn install          # frontend workspace only
yarn dev:infra        # Postgres, RabbitMQ, Traefik gateway (:8080)
```

Pick a dev bundle (see `scripts/dev/README.md`):

```bash
yarn dev:auth:app       # register/login + frontend
yarn dev:companies      # public company list + frontend
yarn dev:dashboard:app  # /app/summary + frontend
```

Gateway: `http://localhost:8080` · Frontend: `http://localhost:5173`

### Seed test data

```bash
cd scripts/fill_dump_db && yarn install && cp .env.example .env
yarn seed:reset         # from scripts/fill_dump_db
```

See [`scripts/fill_dump_db/README.md`](scripts/fill_dump_db/README.md) for test
accounts (`Passw0rd!123`).

## Root scripts

| Script | Purpose |
|---|---|
| `yarn dev:infra` | Infra + gateway |
| `yarn dev:auth:app` | Auth + users + frontend |
| `yarn dev:companies` | Companies + frontend |
| `yarn dev:dashboard:app` | Dashboard + frontend |
| `yarn dev:list` | All bundles / single services |
| `yarn build/lint/test` | Frontend only |

## Architecture docs

- [`docs/architecture/microservices-extraction-checklist.md`](docs/architecture/microservices-extraction-checklist.md)
- [`docs/architecture/gateway-routing.md`](docs/architecture/gateway-routing.md)
- [`docker/dev/README.md`](docker/dev/README.md)
