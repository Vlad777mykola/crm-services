# yarn smoke:prod — minimal production-parity smoke

Builds `companies-service` from its production Dockerfile, runs it in Docker with Postgres + RabbitMQ + Traefik (not host `yarn dev`).

## Ports (distinct from dev / test / verify)

| Resource | Port |
|----------|------|
| Postgres | **35432** |
| RabbitMQ AMQP | **35472** |
| Gateway | **38080** |

Project: `crm-smoke`. Volumes removed on teardown (`down -v`).

## Command

```powershell
yarn smoke:prod
```

**Flow:** `docker build` → `up --wait` → migrate (`:35432`) → seed companies → `GET http://localhost:38080/companies/public` → teardown.

## Full prod stack

For the full `docker/prod/compose.yml` matrix, use `docker/smoke/compose.override.yml` layered on prod once `.env.production` files exist (see `docker/prod/README.md`). The minimal smoke stack in `docker/smoke/compose.yml` does not require those files.
