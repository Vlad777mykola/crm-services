# Dockerfile Standard

## Goal

Every service uses the same multi-stage build pattern. This is **already** the
pattern used by `services/notifications-service/Dockerfile` and every other existing
worker service — this document formalizes it so newly extracted services (auth,
users, companies, ...) don't drift from it.

## Reference (existing, working — copy this pattern)

```2:26:services/notifications-service/Dockerfile
# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, own dependency tree, own database
# access. Build context is this folder only (not the repo root), and it never
# imports backend source. Build with:
#   docker build -f services/notifications-service/Dockerfile -t crm-notifications-service services/notifications-service

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN yarn install

FROM deps AS build
COPY . .
RUN yarn build

FROM base AS production
ENV NODE_ENV=production
COPY package.json ./
RUN yarn install --production --ignore-scripts
COPY --from=build /app/dist ./dist

EXPOSE 4300
CMD ["node", "dist/main.js"]
```

## Yarn workspaces (monorepo dev)

Local development uses **Yarn Classic v1 workspaces** at the repo root (`frontend`,
`services/*`, `scripts/fill_dump_db`). Run `yarn install` once from the repo root.

**Docker builds — two patterns:**

1. **Standalone (default):** each `services/<name>/Dockerfile` uses that folder as build context (`COPY package.json`, local `yarn install`). Works for services with **no** workspace-only dependencies.
2. **Workspace dependency exception:** Node consumers that import `@crm/messaging-kit` depend on the monorepo workspace (`services/messaging-kit/`). Building from the service folder alone cannot resolve that package. Production/smoke images for those services need a **repo-root build context** (or equivalent workspace-aware Dockerfile) until each per-service image is updated.

Messaging-kit consumers need a **repo-root build** (or equivalent workspace-aware Dockerfile) for production images. See [workspace-docker-build.md](./workspace-docker-build.md).

See `docs/architecture/dev-orchestration.md` for dev vs verify vs test vs smoke.

## Required rules

1. **Multi-stage build.** `deps` (install), `build` (compile TypeScript), `production`
   (runtime only) — minimum 3 stages, matching the reference above.
2. **Build TypeScript in the builder stage only.** `production` stage never has
   `typescript` or dev dependencies installed.
3. **Runtime stage installs production dependencies only:**
   `yarn install --production --ignore-scripts`.
4. **Runtime stage copies only `dist/`** from the build stage — never `src/`.
5. **Expose only this service's port**, taken from `service-port-registry.md` — never
   guess or invent a port.
6. **Explicit `CMD`** — `CMD ["node", "dist/main.js"]`, never a shell script wrapper
   unless the service genuinely needs one (none do today).
7. **No secrets baked into the image.** All secrets come from environment variables
   at container start (`.env` file locally, Kubernetes `Secret`/AWS Secrets Manager
   later) — never `COPY .env` or hardcoded values in the Dockerfile.
8. **Build context is usually the service's own folder** — the comment at the top of each Dockerfile states the standalone build command. **Exception:** services that depend on `@crm/messaging-kit` need a workspace-aware build (repo root context). See the "Workspace dependency exception" note above.

## Template for new services

```dockerfile
# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, own dependency tree, own database
# access. Build context is this folder only (not the repo root), and it never
# imports backend source. Build with:
#   docker build -f services/<service-name>/Dockerfile -t crm-<service-name> services/<service-name>

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN yarn install

FROM deps AS build
COPY . .
RUN yarn build

FROM base AS production
ENV NODE_ENV=production
COPY package.json ./
RUN yarn install --production --ignore-scripts
COPY --from=build /app/dist ./dist

EXPOSE <port from service-port-registry.md>
CMD ["node", "dist/main.js"]
```

## Deferred (do not block migration on this)

- **Non-root user in the runtime image.** Add `USER node` (the `node:22-alpine` base
  image already ships a non-root `node` user) once the core extraction phases are
  done — this is production hardening, not required for local Docker Compose
  development or for the strangler migration itself. Track as a Phase 13
  (observability/hardening) follow-up, not a Phase 2–11 blocker.

## Exception: the gateway

The gateway (`services/gateway/`) does not have a Dockerfile at all — it runs the
official `traefik:v3.0` image directly, in `docker/dev/compose.gateway.yml`,
`docker/dev/compose.legacy.yml`, and `docker/prod/compose.yml`, with static config
passed via `command:` args and dynamic routing via Traefik's file provider. There
is nothing to build. See `docs/architecture/gateway-routing.md`. Every other
service in this migration still follows the multi-stage build above.

## Done when

Every new service's Dockerfile matches the template above exactly except for the
service name, build command comment, and exposed port.
