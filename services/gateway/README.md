# gateway

## Purpose

Transparent, path-preserving reverse proxy in front of legacy-backend (and, as each
domain is extracted, in front of the new services). The frontend and all external
clients talk only to the gateway; nothing else is public. See
`docs/architecture/url-convention.md` for the routing/ordering rules this config
implements.

## Owned routes

None — the gateway routes every path in `docs/architecture/route-inventory.md`, it
does not own any of them. As of Phase 1, every route points at `legacy-backend`.
Each later phase changes only the `proxy_pass` target for that domain's paths, not
the path list itself.

## Owned tables / schema

None. The gateway has no database.

## Consumed events / Published events

None. The gateway is HTTP-only.

## Required environment variables

None today — `nginx.conf` hardcodes the `legacy-backend:4000` upstream for Phase 1.
Once services are extracted, new `upstream` blocks are added directly to
`nginx.conf` (nginx does not read `.env` files; upstream hosts are Compose/Kubernetes
service names).

## Local run

Requires `legacy-backend` (the existing `backend/`) running and reachable at
`legacy-backend:4000` from wherever the gateway runs — see
`docker/docker-compose.microservices-core.yml`, which wires the hostname correctly.
Running nginx directly against the host-run backend (`yarn dev` on `:4000`) also
works if you point the upstream at `host.docker.internal:4000` for local testing
outside Compose.

## Docker run

```bash
docker build -f services/gateway/Dockerfile -t crm-gateway services/gateway
docker run -p 8080:8080 --network crm-services_default crm-gateway
```

Prefer `docker compose -f docker/docker-compose.microservices-core.yml up` — it wires
the network and the `legacy-backend` service together.

## Health endpoints

The gateway itself has no `/health/live` or `/health/ready` — health checks are
per-backend (`GET /health`, `/health/live`, `/health/ready` all proxy through to
whichever service currently owns that path, per `nginx.conf`). Nginx's own liveness
can be checked with `docker inspect` or a raw TCP check on `:8080` if needed later.

## Current migration status

**Phase 1.** Every route proxies to `legacy-backend:4000`. No service extraction has
happened yet — this phase only inserts the proxy hop and adds `X-Request-Id`
propagation + centralizes where routing rules live going forward.

Rollback: there is nothing to roll back to yet — removing the gateway entirely and
pointing the frontend back at `legacy-backend:4000` directly is the "undo" for this
phase, since no route has been reassigned to a new service.
