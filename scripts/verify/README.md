# yarn verify:startup

Isolated disposable stack for proving every runnable component boots. **Not** part of daily dev.

## Gate

```powershell
yarn verify:startup
```

**Expect:** all components ready on verify ports, schema + RabbitMQ topology checks, printed startup matrix, then full teardown (no `crm-verify` containers left).

**Never touches** dev Postgres (`:5432`), dev gateway (`:8080`), or dev app ports (`:4001`, `:5173`, etc.).

## Verify ports

| Resource | Port |
|----------|------|
| Postgres | 25432 |
| Postgres AI | 25433 |
| RabbitMQ AMQP | 25672 |
| RabbitMQ mgmt | 25673 |
| Gateway | 28080 |
| Frontend | 15173 |
| Services | dev + 10000 (e.g. auth 14001, companies 14003) |

Env reference: `env/verify/common.env`. Audit table: `scripts/verify/audit-checklist.md`.

## Manual infra only

```powershell
docker compose -p crm-verify -f docker/verify/compose.yml up -d --wait
docker compose -p crm-verify -f docker/verify/compose.yml ps
docker compose -p crm-verify -f docker/verify/compose.yml down -v
```

## Dev CORS check (separate from verify)

```powershell
yarn dev:infra
curl.exe -i -X OPTIONS "http://localhost:8080/health" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"
```

## Daily dev

Use `yarn dev` / `yarn dev <feature>` — see `scripts/dev/README.md`.
