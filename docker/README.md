# docker

Docker Compose orchestration only. Dockerfiles for each deployable service live
inside that service's own folder (`backend/Dockerfile`, `frontend/Dockerfile`,
`services/*/Dockerfile`), never duplicated here, so each service stays
independently buildable/deployable outside of Compose too.

Split into two independent setups - **do not mix files across them**:

- [`dev/`](dev/README.md) - local development. Infra + gateway in Docker; app
  services usually run with `yarn dev` for fast reload; optional Docker-run
  services via Compose profiles.
- [`prod/`](prod/README.md) - temporary/cheap production deployment (before the
  real target, Kubernetes/AWS EKS - see
  [`docs/architecture/target-production-architecture.md`](../docs/architecture/target-production-architecture.md)).
  Every app service runs as a built image; only the gateway publishes a port.

See [`docs/architecture/gateway-routing.md`](../docs/architecture/gateway-routing.md)
for how the Traefik gateway's routing rules work (same rules in both `dev/` and
`prod/`, just pointed at different backend hosts), and
[`docs/architecture/service-port-registry.md`](../docs/architecture/service-port-registry.md)
for the single source of truth on every service's port.

## Rules

- Do not use comment/uncomment toggles for optional services - use Compose
  `profiles` (already the pattern for `events`/`node-workers`/`python-workers`).
- Do not run `prod/` compose files for daily coding, and do not run `dev/`
  compose files as a deployment target.
- Never commit real `.env.production` files.
