# Database Migrations

The repository is moving from bootstrap DDL toward versioned, per-service TypeORM
migrations.

Current rule while this rollout is in progress:

```text
Current db:migrate is real only for migrated services.
Older schemas still use bootstrap DDL until their service receives migrations.
```

## Sources Of Truth

| File or folder | Role |
|---|---|
| `services/*/src/db/schema.ts` | Temporary service startup bootstrap. Do not add new production DDL here. |
| `scripts/fill_dump_db/src/ensure-schemas.ts` | Temporary root/dev bootstrap for services not migrated yet. |
| `services/*/src/db/entities/*.entity.ts` | Runtime TypeORM mapping. Keep aligned with migrations, but do not treat as the database source of truth. |
| `services/*/src/db/migrations/*` | Target source of truth for migrated services. |

## Migrated Services

| Service | Schema | Migrations table |
|---|---|---|
| `users-service` | `users_schema` | `typeorm_migrations_users` |
| `specialists-service` | `specialists_schema` | `typeorm_migrations_specialists` |
| `appointments-service` | `appointments_schema` | `typeorm_migrations_appointments` |

Run migrations from the repo root:

```bash
yarn db:migrate --target dev
yarn db:migration:status --target dev
yarn db:migrate:revert --service users-service --target dev
```

The old bootstrap command is still available during rollout:

```bash
yarn db:bootstrap:legacy --target dev
```

Service startup must not mutate production database structure. During rollout,
`AUTO_DDL` defaults to true outside production for local compatibility and false
in production. Set it explicitly when a deployment needs stricter behavior.
