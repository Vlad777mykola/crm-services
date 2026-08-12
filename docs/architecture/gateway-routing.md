# Gateway Routing (Traefik)

## Decision: Traefik, not nginx

**Changed from the original Phase 1 implementation.** The gateway is **Traefik**,
not nginx.

Why: the same rule/priority model carries forward almost unchanged into
Kubernetes (Traefik Ingress Controller) or AWS Load Balancer Controller later —
nginx would mean maintaining two different routing syntaxes across the migration
(hand-written `nginx.conf` locally, then Ingress YAML in Kubernetes), while Traefik
uses one rule language (`Host`, `PathPrefix`, `PathRegexp`, `priority`) across both.

## Decision: file provider, not Docker provider

**Changed after the first real run.** The original implementation used Traefik's
Docker provider with routing rules as labels on `legacy-backend`. On at least one
real Windows/Docker Desktop setup this failed outright:

```txt
gateway-1  ERR Failed to retrieve information of the docker client and server host  providerName=docker
```

The Docker provider needs to talk to the Docker daemon over
`/var/run/docker.sock`, and that access is flaky across Docker Desktop versions/
platforms. **Traefik now uses the file provider instead** — routing rules live in
plain YAML files, and Traefik just proxies to a URL like any other reverse proxy.
No daemon access, no socket mount, no labels on `legacy-backend` (or any future
service).

## `docker/dev` vs `docker/prod`

Docker setup is split into two independent trees — see `docker/README.md`. Three
dynamic-config files exist, kept in sync with each other (same routers/rules/
priorities, different backend host):

| File | Used by | Backend target |
|---|---|---|
| `docker/dev/traefik/dynamic.container.yml` | `docker/dev/compose.legacy.yml` | `http://legacy-backend:4000` (Compose service DNS, container-parity dev mode) |
| `docker/dev/traefik/dynamic.host.yml` | `docker/dev/compose.gateway.yml` | `http://host.docker.internal:4000` (legacy-backend running via `yarn dev` on the host — the fast day-to-day loop) |
| `docker/prod/traefik/dynamic.yml` | `docker/prod/compose.yml` | `http://legacy-backend:4000` (Compose service DNS, prod stack) |

Use whichever dev compose file matches how you're running the backend that day —
see `docker/dev/README.md`. Extracting a domain means editing the matching router
(`service:` target + the corresponding `services:` entry) in **all three** files
— `rule:` and `priority:` never change.

## No `/api` prefix (unchanged)

Same rule as `url-convention.md` — Traefik routes preserve every path exactly as-is.

## Ordered routing: priority, not label order

Traefik does **not** guarantee that labels are evaluated in the order they're
written. Two routers whose rules could both match the same request are resolved by
explicit `priority` (higher number wins) — if no explicit priority is set, Traefik
falls back to sorting by rule string length (longest = highest), which is fragile
and easy to get wrong by accident as more routers are added.

**Rule: every router in this migration sets an explicit `priority`.** Never rely on
the default length-based sort.

Priority bands used in every dynamic-config file and every phase after Phase 1:

| Band | Meaning |
|---|---|
| 100 | Most specific nested route in its group (e.g. `/companies/:id/members`) |
| 80–99 | Other specific nested routes in the same group, ordered by specificity |
| 10 | Generic fallback for that top-level prefix (e.g. `/companies` catch-all) |

Example — companies group:

```txt
/companies/:id/members       priority 100  -> company-members-service (Phase 5)
/companies/:id/services      priority 95   -> services-catalog-service (Phase 8)
/companies/:id/appointments  priority 90   -> appointments-service (Phase 9)
/companies/:id/specialists/requests  priority 89  -> company-specialists-service (Phase 7)
/companies/:id/specialist-requests   priority 88  -> company-specialists-service (Phase 7)
/companies/:id/specialists           priority 87  -> company-specialists-service (Phase 7)
/companies/:id/reviews       priority 80   -> reviews-service (Phase 10)
/companies/:id/summary       priority 79   -> legacy / future read-api (Phase 15)
/companies/:id/status-history priority 78  -> companies-service (Phase 4)
/companies                   priority 10   -> companies-service fallback (Phase 4)
```

Every router today points at `legacy-backend` — extracting a domain means changing
only that router's `service:` target (and adding the new service's entry under
`services:` with its port from `service-port-registry.md`) in **all three**
dynamic-config files listed above. The `rule:` and `priority:` values do not change.

## Rule syntax reference (Traefik v3, confirmed, file provider)

| Matcher | Use for |
|---|---|
| `Path(`/exact/path`)` | Exact match only — mirrors nginx's `location =` |
| `PathPrefix(`/prefix`)` | Everything under a prefix — mirrors nginx's plain `location /prefix/` |
| `PathRegexp(`^/companies/[^/]+/members`)` | Variable path segments (`:companyId`, `:id`, etc.) |

Each router also sets `entryPoints: [web]` (never the `traefik` entrypoint, which
is dashboard/API-only) and an explicit `priority:` — same reasoning as above, just
YAML keys in a file instead of Docker labels.

## Dashboard (local dev only)

Both `docker/dev` gateway compose files pass `--api.dashboard=true` +
`--api.insecure=true`, exposing Traefik's dashboard unauthenticated on the
dedicated `:8081` entrypoint (separate from the `:8080` app traffic entrypoint) -
a local-dev convenience for inspecting which routers are registered and matched.
`docker/prod/compose.yml` deliberately omits both flags and the `:8081` port
entirely — there is no dashboard in production.

## Known gap vs. the nginx draft: no built-in request-id generation

nginx has a built-in `$request_id` variable; Traefik v3 has no equivalent built-in
directive for generating a per-request correlation id. For Phase 1, this means:

- Traefik forwards whatever `X-Request-Id` header the client sent, unchanged (no
  header rewriting is configured).
- `backend/src/common/middleware/requestLogger.ts` already generates one via
  `randomUUID()` when the incoming request has no `X-Request-Id` header — so every
  request is still logged with *some* id, but Traefik's own access log for that
  request won't share it unless the client set one.
- This is an accepted, documented gap for Phase 1. If end-to-end correlation through
  the gateway hop itself becomes necessary before Phase 13 (observability), options
  are: a small Traefik plugin, or a lightweight custom middleware service sitting
  between Traefik and legacy-backend. Not needed for the strangler migration itself
  to work correctly.

## Kubernetes later (unchanged direction, now more direct)

Traefik Ingress Controller (or the Kubernetes Gateway API, or AWS Load Balancer
Controller on EKS) replaces these file-provider dynamic-config files with
`IngressRoute` CRDs or `Ingress` YAML using the same `PathPrefix`/`Path` concepts
and an equivalent priority mechanism. Because the gateway is already Traefik, the
Compose→Kubernetes move is a config-format change, not a routing-engine change.
