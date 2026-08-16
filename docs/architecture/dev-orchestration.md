# Dev orchestration (implementation complete)

Intent-based local dev, isolated verification, testing, and prod-parity smoke — as specified in the orchestration plan.

## Three environments

| Mode | Purpose | Command | Ports (examples) |
|------|---------|---------|------------------|
| **dev** | Daily development | `yarn dev <feature>` | DB `:5432`, gateway `:8080`, apps `:4001+` |
| **verify** | Startup gate (CI) | `yarn verify:startup` | DB `:25432`, gateway `:28080`, apps `:14001+` |
| **test** | Integration/E2E | `yarn test:integration` / `test:e2e` | DB `:15432`, gateway `:18080`, apps `:24001+` |
| **smoke** | Prod Dockerfile check | `yarn smoke:prod` | DB `:35432`, gateway `:38080` |

Dev uses **host services + Docker infra**. Verify/test/smoke use **isolated Docker projects** with disposable volumes (`down -v`).

## Database data strategy

| Command | Role |
|---------|------|
| `db:migrate` | Schemas only |
| `db:backup` / `db:restore` | Personal snapshots (`db/backups/`) |
| `db:baseline:*` | Team sanitized baseline |
| `db:seed:*` | Explicit profiles only (`companies`, `full`, `test`) |

Details: [`scripts/db/README.md`](../../scripts/db/README.md).

## Daily dev

```powershell
yarn install
yarn dev                  # default: companies
yarn dev dashboard --fresh
yarn dev stop
```

Features: `scripts/dev/features.mjs` — `auth`, `companies`, `companies-members`, `dashboard`, `core`, `full`.

Pipeline: static `check` → `ensureInfra` → schema migrate (if feature declares `schemas[]`) → optional `--fresh` reset/seed → spawn → readiness.

## Verification gate

```powershell
yarn verify:startup
```

Proves all runnable components on isolated verify ports. Not required before every local edit — run in CI, after infra/startup changes, or when debugging environment issues.

Audit table: `scripts/verify/audit-checklist.md`.

## Automated tests

| Command | Scope |
|---------|--------|
| `yarn test:unit` | Frontend + all service vitest suites |
| `yarn test:integration` | Test stack + companies API via gateway |
| `yarn test:e2e` | + CORS + frontend on `:25173` |
| `yarn smoke:prod` | Production image + gateway API |

## CI

| Workflow | Runs |
|----------|------|
| `.github/workflows/repo-ci.yml` | lint, typecheck, unit, integration, e2e, verify:startup, image build |
| `.github/workflows/repo-smoke.yml` | `yarn smoke:prod` on `main` |

## Yarn workspaces

Root `yarn install` installs `frontend`, `services/*` (including `@crm/messaging-kit`),
and `scripts/fill_dump_db`.

**Docker:** per-service context works for standalone services; messaging-kit consumers
need repo-root workspace builds — see [workspace-docker-build.md](./workspace-docker-build.md)
and [dockerfile-standard.md](./dockerfile-standard.md).

**`yarn smoke:prod`** builds `companies-service` from `services/companies-service/Dockerfile`
today; that image imports `@crm/messaging-kit` and may fail until compose uses a
workspace-aware build.

## Key paths

| Path | Role |
|------|------|
| `scripts/dev/run.mjs` | Intent-based dev runner |
| `scripts/dev/port-registry.mjs` | Dev / verify / test / smoke ports |
| `scripts/process/` | Spawn, signals, Windows tree kill |
| `scripts/verify/startup.mjs` | Verify matrix |
| `scripts/test/stack.mjs` | Test stack lifecycle |
| `docker/verify/`, `docker/test/`, `docker/smoke/` | Isolated compose stacks |
| `env/{dev,verify,test,smoke}/common.env` | Reference env per mode |

## Success criteria (plan)

1. `yarn verify:startup` — full matrix on isolated ports; CI gate, not daily prerequisite.
2. `yarn dev dashboard` — schemas ensured on start; `--fresh` = wipe + seed only.
3. `yarn dev stop` — tracked PIDs only (safe default).
4. `yarn dev full` — all components proven by verify.
5. `yarn test:e2e` — non-dev ports; always tears down.
6. `yarn install` — single install at repo root.
7. `yarn smoke:prod` — prod topology via minimal smoke stack; `docker/prod` unchanged.
