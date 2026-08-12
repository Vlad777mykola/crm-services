# Service Port Registry

Single source of truth for local/dev ports, so the coding agent never invents one.
Every new service's `EXPOSE` line, `.env.example` default, and `docker/dev/*.yml` /
`docker/prod/*.yml` port mapping must match this table.

## Correction from the proposed example list

The initially proposed registry listed `notifications-service: 4010`. That is
**wrong** — `notifications-service` is already deployed and running on port `4300`
today (`services/notifications-service/Dockerfile` → `EXPOSE 4300`; also confirmed in
`docker/dev/compose.services.yml` → `ports: ['4300:4300']`). The table below uses
the real, already-running port for every service that already exists, and only
assigns fresh ports to services that don't exist yet.

## Already running (do not change)

| Service | Port | Source of truth |
|---|---|---|
| metrics-service | 4100 | `services/metrics-service/Dockerfile` → `EXPOSE 4100` |
| ai-service | 4200 | `services/ai-service/Dockerfile` → `EXPOSE 4200` |
| notifications-service | 4300 | `services/notifications-service/Dockerfile` → `EXPOSE 4300` |
| postgres | 5432 | `docker/dev/compose.infra.yml` |
| postgres-ai | 5433 (host) → 5432 (container) | `docker/dev/compose.infra.yml` |
| redis | 6379 | `docker/dev/compose.infra.yml` (reserved, unused) |
| rabbitmq | 5672 (AMQP), 15672 (management UI) | `docker/dev/compose.infra.yml` |

## New — gateway (Phase 1)

| Service | Port |
|---|---|
| gateway | 8080 |

## New — domain services (Phases 2–10)

Assigned in extraction order, in the `4001`–`4010` range — clear of the `4100`–
`4500` block used by worker services.

| Service | Port | Phase |
|---|---|---|
| auth-service | 4001 | 2 |
| users-service | 4002 | 2/3 |
| companies-service | 4003 | 4 |
| company-members-service | 4004 | 5 |
| specialists-service | 4005 | 6 |
| company-specialists-service | 4006 | 7 |
| services-catalog-service | 4007 | 8 |
| appointments-service | 4008 | 9 |
| reviews-service | 4009 | 10 |
| dashboard-service | 4010 | 15 |

## New — per-service outbox-publisher instances (Q8)

Per Q8, `outbox-publisher` is redeployed once per extracted service (same image,
different `DATABASE_URL`), not forked. Each deployment needs its own health-check
port, separate from the shared/legacy one (4500) and from the domain service's own
port above.

| Outbox-publisher instance | Health port | Points at |
|---|---|---|
| outbox-publisher (auth-service) | 4501 | `auth_schema.outbox_events` |
| outbox-publisher (users-service) | 4502 | `users_schema.outbox_events` |
| outbox-publisher (companies-service) | 4503 | `companies_schema.outbox_events` |
| outbox-publisher (company-members-service) | 4504 | `company_members_schema.outbox_events` |
| outbox-publisher (specialists-service) | 4505 | `specialists_schema.outbox_events` |
| outbox-publisher (company-specialists-service) | 4506 | `company_specialists_schema.outbox_events` |
| outbox-publisher (services-catalog-service) | 4507 | `services_schema.outbox_events` |
| outbox-publisher (appointments-service) | 4508 | `appointments_schema.outbox_events` |
| outbox-publisher (reviews-service) | 4509 | `reviews_schema.outbox_events` |

## Rules

- Frontend calls only the gateway (`8080` locally, `https://api.example.com` in
  production per `url-convention.md`).
- Only the gateway is public. Every service port above is internal-only once
  Kubernetes/EKS is in play (Ingress fronts the gateway; services are
  ClusterIP-only).
- Direct host port exposure (the `ports:` mappings in `docker/dev/*.yml`) is a
  **local/dev convenience only** — it lets you curl a service directly while
  debugging. `docker/prod/compose.yml` and any future Kubernetes manifests use
  `expose` only (no host port) for everything except the gateway.
- If a new service is added beyond reviews-service, continue the sequence
  (`4010`, `4011`, ...) rather than reusing or renumbering existing entries.

## Done when

Every service's Dockerfile `EXPOSE`, `.env.example` port default, and
`docker-compose.*.yml` port mapping match this table exactly.
