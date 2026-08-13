# Test orchestration (`yarn test:*`)

Isolated **test stack** — never uses dev (`:5432`, `:8080`, `:4003`, `:5173`) or verify (`:25432`, `:28080`, `:14003`, `:15173`).

## Port map

| Resource   | Dev    | Verify | Test   |
|------------|--------|--------|--------|
| Postgres   | 5432   | 25432  | **15432** |
| RabbitMQ   | 5672   | 25672  | **15472** |
| Gateway    | 8080   | 28080  | **18080** |
| Frontend   | 5173   | 15173  | **25173** |
| companies  | 4003   | 14003  | **24003** |

App ports in test = dev + **20000**. Traefik routes are generated into `docker/test/traefik/dynamic.yml` from `docker/dev/traefik/dynamic.host.yml`.

Docker project: `crm-test`. Volumes are removed on teardown (`down -v`).

## Commands

```powershell
# Unit tests (no Docker)
yarn test:unit

# Integration: stack + migrate + seed + companies-service + GET /companies/public
yarn test:integration

# E2E: integration path + CORS check + frontend on :25173
yarn test:e2e
```

## Manual checks

```powershell
# Start stack only (leaves containers running)
docker compose -p crm-test -f docker/test/compose.yml up -d --wait

# Gateway ping
curl http://localhost:18080/ping

# Tear down (always use -v for disposable DB)
docker compose -p crm-test -f docker/test/compose.yml down -v --remove-orphans
```

## Test DB seed

`yarn workspace @crm/fill-dump-db run seed:test` — resets schemas, seeds 2 published companies + deterministic users from `test-fixtures.ts`. Uses `DATABASE_URL` from env (defaults to dev `:5432`; test scripts inject `:15432/crm_test`).

## Files

- `docker/test/compose.yml` — postgres, rabbitmq, gateway
- `scripts/test/stack.mjs` — up/down, migrate, seed, spawn services
- `scripts/test/generate-test-traefik.mjs` — regenerate Traefik routes
- `env/test/common.env` — reference env for test ports
