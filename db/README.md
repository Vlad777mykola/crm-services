# Database workflow

Four separate concerns:

| Concept | Purpose |
|---------|---------|
| **Migrations** (`yarn db:migrate`) | TypeORM migrations for migrated services |
| **Seeds** (`yarn db:seed:*`) | Deterministic scenarios |
| **Backups** (`yarn db:backup`) | Personal snapshots in `backups/` (gitignored) |
| **Baseline** (`yarn db:baseline:*`) | Sanitized team artifact |

Temporary rollout note: `db:bootstrap:legacy` still exists for non-migrated
schemas while services move to `services/*/src/db/migrations`.

Seed/fill commands are development/test only. Production must use migrations,
backup/restore, and smoke/preflight checks instead of dev fill data.

See [`scripts/db/README.md`](scripts/db/README.md) for commands.

```text
db/backups/   — private *.dump
db/baseline/  — manifest + pulled team-baseline.dump
```
