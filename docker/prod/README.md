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
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.auth
cp services/notifications-service/.env.example services/notifications-service/.env.production
cp services/metrics-service/.env.example services/metrics-service/.env.production
cp services/backend-projection-service/.env.example services/backend-projection-service/.env.production
cp services/ai-service/.env.example services/ai-service/.env.production
cp services/auth-service/.env.example services/auth-service/.env.production
cp services/users-service/.env.example services/users-service/.env.production
cp services/companies-service/.env.example services/companies-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.companies
cp services/company-members-service/.env.example services/company-members-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.company-members
cp services/specialists-service/.env.example services/specialists-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.specialists
cp services/company-specialists-service/.env.example services/company-specialists-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.company-specialists
cp services/services-catalog-service/.env.example services/services-catalog-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.services-catalog
cp services/appointments-service/.env.example services/appointments-service/.env.production
cp services/outbox-publisher/.env.example services/outbox-publisher/.env.production.appointments
```

Then fill in real values in every file. The `DATABASE_URL`/`RABBITMQ_URL` values
in each service's `.env.production` must use the same credentials you set in
`docker/prod/.env.production` (host is the Compose service name, e.g.
`postgres`, `rabbitmq` - not `localhost`).

`services/outbox-publisher/.env.production.auth` is a **second, separate**
copy for the `outbox-publisher-auth` service (Q8 - same image, different
config) - its `DATABASE_URL` must add `?options=-c%20search_path%3Dauth_schema`
so it reads/writes `auth_schema.outbox_events` instead of the default schema,
and its `HEALTH_PORT` must be `4501` (the shared `outbox-publisher` keeps
`4500`) - see `docs/architecture/service-port-registry.md`.

`services/auth-service/.env.production`'s `JWT_ACCESS_SECRET` must match
`backend/.env.production`'s exactly, or tokens auth-service issues won't
verify against not-yet-extracted legacy routes (Phase 2 Task 2.6). The same
applies to `services/companies-service/.env.production`'s `JWT_ACCESS_SECRET`
(Phase 4), `services/specialists-service/.env.production`'s `JWT_ACCESS_SECRET`
(Phase 6), `services/company-specialists-service/.env.production`'s
`JWT_ACCESS_SECRET` (Phase 7), `services/services-catalog-service/.env.production`'s
`JWT_ACCESS_SECRET` (Phase 8), and `services/appointments-service/.env.production`'s
`JWT_ACCESS_SECRET` (Phase 9) — every service that verifies tokens must share
this value.

`services/outbox-publisher/.env.production.companies` is the same pattern as
`.env.production.auth`, pointed at `companies_schema` (`?options=-c%20search_path%3Dcompanies_schema`)
with `HEALTH_PORT=4503`. Same for `.env.production.company-members`
(`company_members_schema`, `HEALTH_PORT=4504`) and
`.env.production.appointments` (`appointments_schema`, `HEALTH_PORT=4508`).

`services/auth-service/.env.production` now also needs `RABBITMQ_URL` set —
since Phase 5 it consumes `company-member.*` into its membership projection.

## Start

```bash
docker compose -f docker/prod/compose.yml up -d --build
```

Adds every service in the "Production deployment matrix"
(`target-production-architecture.md`): `gateway`, `legacy-backend`,
`outbox-publisher`, `notifications-service`, `metrics-service`,
`backend-projection-service`, `ai-service`, plus, since Phase 2/3, `auth-service`,
`outbox-publisher-auth`, `users-service`, since Phase 4, `companies-service`,
`outbox-publisher-companies`, and since Phase 5, `company-members-service`,
`outbox-publisher-company-members`, since Phase 6, `specialists-service`,
`outbox-publisher-specialists`, since Phase 7, `company-specialists-service`,
`outbox-publisher-company-specialists`, since Phase 8, `services-catalog-service`,
`outbox-publisher-services-catalog`, and since Phase 9, `appointments-service`,
`outbox-publisher-appointments` - and self-hosted `postgres`,
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
