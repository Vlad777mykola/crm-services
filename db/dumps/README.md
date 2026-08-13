# Database dumps

Binary Postgres archives (`pg_dump -Fc`) for fast local reset — **not** for production.

## Files

| File | Purpose |
|------|---------|
| `dev-baseline.dump` | Default dev snapshot (create with `yarn db:dump`) |

Dump files are **gitignored** (local only). Regenerate after you change seed data you like.

## Commands

```powershell
# Snapshot current dev DB (postgres :5432, docker dev infra must be up)
yarn db:dump

# Restore snapshot (replaces objects in target DB)
yarn db:restore

# Custom name
yarn db:dump my-snapshot.dump
yarn db:restore my-snapshot.dump
```

`DATABASE_URL` selects the target:

| Port | Stack |
|------|-------|
| 5432 | dev (persistent volume) |
| 15432 | test (`crm-test`) |
| 35432 | smoke (`crm-smoke`) |

Verify stack (`:25432`) is blocked for dump/restore.

## vs seed

| Need | Use |
|------|-----|
| Fast repeat dev state | `db:dump` once, then `db:restore` |
| Minimal companies list | `yarn db:seed:companies` |
| Full walkthrough data | `yarn db:seed:full` |
| CI / deterministic tests | `yarn db:seed:test` on `:15432` |

`yarn db:migrate` — schemas only, no data.
