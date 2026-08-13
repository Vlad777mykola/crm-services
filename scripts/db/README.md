# Database tooling (`yarn db:*`)

Three **separate** concerns:

```text
db:migrate     → schema/tables only (no rows)
db:dump/restore → snapshot binary (fast repeat dev state)
db:seed:*      → explicit profiles for special data (isolated, opt-in)
```

## How data gets into Postgres today

| Layer | What it does | When it runs |
|-------|----------------|--------------|
| **Services on startup** | Each service runs `ensure*Schema()` | Every `yarn dev` service start |
| **`yarn db:migrate`** | `fill_dump_db` `ensureAllMicroserviceSchemas()` | Feature with `schemas[]`, test/smoke before seed |
| **`yarn db:restore`** | `pg_restore` from `db/dumps/*.dump` | `--fresh` if baseline exists; manual |
| **`yarn db:seed:*`** | TypeScript inserts via `fill_dump_db` | Only when you ask |

There is **no** automatic full seed on normal `yarn dev` — only migrate when a feature needs schemas.

## Dump / restore (recommended for dev reset)

```powershell
yarn dev:infra
yarn db:seed:full:reset    # once: build dataset you like
yarn db:dump               # → db/dumps/dev-baseline.dump (gitignored)

# Later — fast reset
yarn db:restore
# or
yarn dev dashboard --fresh   # uses baseline if present
```

Uses Docker `pg_dump` / `pg_restore` inside the compose postgres container. `DATABASE_URL` port selects stack (`5432` dev, `15432` test, `35432` smoke).

## Seed profiles (isolated)

```powershell
yarn db:seed                  # prints help — no default profile
yarn db:seed:companies        # 2 published companies
yarn db:seed:companies:reset  # truncate companies + insert
yarn db:seed:full             # full dataset + Passw0rd!123 accounts
yarn db:seed:full:reset       # truncate + full seed
yarn db:seed:test             # deterministic fixtures (test port :15432)
```

Implementation: `scripts/fill_dump_db/` (TypeScript + `pg`). See [`fill_dump_db/README.md`](fill_dump_db/README.md).

## Other commands

```powershell
yarn db:reset    # truncate seeded tables only (no re-insert)
yarn db:migrate  # CREATE SCHEMA/TABLE IF NOT EXISTS
```

## Environment

Set `DATABASE_URL` to target a stack (defaults in `scripts/fill_dump_db` → `localhost:5432/crm`).

Reference env files: `env/dev/common.env`, `env/test/common.env`, `env/smoke/common.env`.

Dumps: [`db/dumps/README.md`](../../db/dumps/README.md).
