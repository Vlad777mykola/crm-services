# Database tooling (`yarn db:*`)

Four separate concerns:

| Command family | Purpose |
|----------------|---------|
| `db:migrate` | Structure source of truth |
| `db:seed:*` | Deterministic scenarios |
| `db:backup` / `db:restore` | Personal snapshots (`db/backups/`, gitignored) |
| `db:baseline:*` | Sanitized team artifact |

All destructive commands use `--target` (`dev`, `test`, `verify`, `smoke`) and enforce target-idle safety.

## Schema

```powershell
yarn db:migrate --target dev
yarn db:reset --target dev          # all application state; preserves structure
```

## Seeds

```powershell
yarn db:seed:companies --target dev
yarn db:seed:full --target dev
yarn db:seed:test --target test
yarn db:seed:companies:reset --target dev
yarn db:seed:full:reset --target dev
```

## Personal backup / restore

```powershell
yarn db:backup --target dev
yarn db:backup --target dev --name before-refactor
yarn db:backup:list

yarn db:restore --target dev --file db/backups/before-refactor.dump
```

Restore: exact snapshot, auto-backup `{target}-auto-before-restore-*.dump`, drop/recreate, purge RabbitMQ, **no migrate**.

## Team baseline

```powershell
yarn db:baseline:create
yarn db:baseline:pull
yarn db:baseline:info
yarn db:baseline:restore --target dev
```

Baseline restore migrates forward once. Publish `dev-baseline-v{N}-{commit}.dump` and set `manifest.artifactUrl`.

## Dev orchestration

```powershell
yarn dev dashboard --fresh      # reset → migrate → seed
yarn dev dashboard --baseline   # baseline:restore → start
```

See [`db/README.md`](../../db/README.md) and [`fill_dump_db/README.md`](fill_dump_db/README.md).
