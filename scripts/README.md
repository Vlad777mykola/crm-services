# scripts

Standalone developer tooling that isn't part of any deployable service. Each
subfolder is its own small package with its own `package.json` - run its `yarn
install` once, then use its own scripts.

## Available scripts

- [`dev/`](dev/README.md) - local microservice dev: `yarn dev:list`, per-service
  scripts (`yarn dev:svc:auth`), bundles (`yarn dev:auth:app`), and how host ports +
  Traefik `:8080` work together.
- [`fill_dump_db/`](fill_dump_db/README.md) - seeds Postgres with fake data. Use
  `yarn seed:companies` for two published companies in `companies_schema` (microservices
  dev loop); `yarn seed` / `yarn seed:reset` for the full legacy dataset plus a mirror
  into `companies_schema`, test login accounts, and every status/enum value.
