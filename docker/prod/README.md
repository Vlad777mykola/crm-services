# docker/prod

Temporary/cheap production shape: every deploy unit as a container on one
Docker host, behind a Traefik gateway that publishes the only public port.
**Real target production is Kubernetes/AWS EKS** (see
[`docs/architecture/target-production-architecture.md`](../../docs/architecture/target-production-architecture.md));
this folder is the interim option before that migration, not a replacement
for it - the same Dockerfiles and images carry forward unchanged either way.

**Not yet used or verified against a live host.** This is a scaffold matching
the "Production deployment matrix" already documented in
`target-production-architecture.md`. Treat it as a starting point, not a
tested deployment.

## Required env files (never commit real ones)

```bash
cp docker/prod/.env.production.example docker/prod/.env.production
cp backend/.env.example backend/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production
cp services/notifications-service/.env.example services/notifications-service/.env.production
cp services/metrics-service/.env.example services/metrics-service/.env.production
cp services/backend-projection-service/.env.example services/backend-projection-service/.env.production
cp services/ai-service/.env.example services/ai-service/.env.production
```

Then fill in real values in every file. The `DATABASE_URL`/`RABBITMQ_URL` values
in each service's `.env.production` must use the same credentials you set in
`docker/prod/.env.production` (host is the Compose service name, e.g.
`postgres`, `rabbitmq` - not `localhost`).

## Start

```bash
docker compose -f docker/prod/compose.yml up -d --build
```

Adds every service in the "Production deployment matrix"
(`target-production-architecture.md`): `gateway`, `legacy-backend`,
`outbox-publisher`, `notifications-service`, `metrics-service`,
`backend-projection-service`, `ai-service`, plus self-hosted `postgres`,
`redis`, `rabbitmq`, `postgres-ai`. Only `gateway` publishes a host port
(`80`) - every other service uses `expose`, reachable only from other
containers on this stack's network.

## Logs

```bash
docker compose -f docker/prod/compose.yml logs -f gateway
docker compose -f docker/prod/compose.yml logs -f legacy-backend
```

## Smoke check

```bash
curl -i http://YOUR_SERVER_IP/health
curl -i http://YOUR_SERVER_IP/health/ready
curl -i http://YOUR_SERVER_IP/companies/public
curl -i http://YOUR_SERVER_IP/auth/me
```

## Stop

```bash
docker compose -f docker/prod/compose.yml down
```

## Extracting a domain into its own service

1. Add the new service to `compose.yml` (image build, `expose` its
   `service-port-registry.md` port, `restart: unless-stopped`, matching
   `env_file`).
2. In `traefik/dynamic.yml`, repoint that domain's router's `service:` at the
   new service instead of `legacy-backend`, and add its entry under
   `services:`. `rule:`/`priority:` never change.
3. Mirror the same two edits in `docker/dev/compose.legacy.yml` +
   `docker/dev/traefik/dynamic.container.yml` and
   `docker/dev/compose.gateway.yml` + `docker/dev/traefik/dynamic.host.yml`,
   so dev and prod stay consistent. See
   [`docs/architecture/gateway-routing.md`](../../docs/architecture/gateway-routing.md).

## Self-hosted Postgres/RabbitMQ are interim

Swap `postgres`/`postgres-ai`/`rabbitmq` for managed services (RDS, Amazon MQ,
etc.) whenever available - only the `DATABASE_URL`/`RABBITMQ_URL` values in
each app's `.env.production` need to change; no compose/Traefik edits needed.
