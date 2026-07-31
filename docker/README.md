# docker

Local development infrastructure. Dockerfiles for each deployable service live inside
that service's own folder (`backend/Dockerfile`, `frontend/Dockerfile`) so each stays
independently buildable/deployable outside of Compose too - Compose here is purely for
local orchestration.

## Usage

Run from the repository root:

```bash
# Just the infra (run backend/frontend on the host via `yarn dev` against these)
docker compose -f docker/docker-compose.yml up postgres redis

# Infra + backend, all containerized
docker compose -f docker/docker-compose.yml up postgres redis backend

# Optional: containerized frontend too (local parity only - not the real deploy path)
docker compose -f docker/docker-compose.yml --profile tools up

# Optional: background workers, once they exist (Step 10)
docker compose -f docker/docker-compose.yml --profile workers up
```

## Services

- `postgres` (`postgres:16-alpine`, port 5432) - always available, no profile.
- `redis` (`redis:7-alpine`, port 6379) - always available, no profile.
- `backend` (port 4000) - built from `../backend/Dockerfile`; waits for postgres/redis health checks.
- `frontend` (port 8080, `tools` profile) - built from `../frontend/Dockerfile`, served via nginx. Optional local parity container; real deploys go to GitHub Pages / later S3+CloudFront.
- Workers (`workers` profile) - added once Step 10 creates worker entrypoints.
