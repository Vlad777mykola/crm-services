# Database workflow

Four separate concerns:

| Concept | Purpose |
|---------|---------|
| **Migrations** (`yarn db:migrate`) | Structure source of truth |
| **Seeds** (`yarn db:seed:*`) | Deterministic scenarios |
| **Backups** (`yarn db:backup`) | Personal snapshots in `backups/` (gitignored) |
| **Baseline** (`yarn db:baseline:*`) | Sanitized team artifact |

See [`scripts/db/README.md`](scripts/db/README.md) for commands.

```text
db/backups/   — private *.dump
db/baseline/  — manifest + pulled team-baseline.dump
```
