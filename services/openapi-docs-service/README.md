# openapi-docs-service

Dev-only Swagger UI for the hand-written OpenAPI contract in `contracts/openapi.yaml`.

**Never deployed to production.** The service exits immediately when `NODE_ENV=production`.

## Local run

Requires the gateway (`yarn dev:infra`) so "Try it out" requests go through Traefik at `:8080`.

```bash
yarn dev:docs
# or: yarn dev svc openapi-docs
```

Open **http://localhost:8080/docs/** (gateway) or **http://localhost:4012/docs/** (direct).

The spec is bundled to `contracts/openapi.json` on each start. To bundle manually:

```bash
yarn contracts:bundle
```

## Routing

Traefik route lives only in `docker/dev/traefik/dynamic.host.yml` (`PathPrefix(/docs)` → `:4012`), mirroring the rabbitmq-lab dev-only pattern. Not present in prod compose or `dynamic.container.yml`.
