# Workspace-aware Docker build (Yarn Classic v1)

Services that depend on **`@crm/messaging-kit`** cannot use a standalone per-service
Docker build context (`services/<name>/` only). Yarn workspaces resolve
`@crm/messaging-kit` from `services/messaging-kit/` at the monorepo root.

## Messaging-kit consumers (need workspace build)

| Service | Uses messaging-kit for |
| ------- | ---------------------- |
| auth-service | `connectManaged`, retry topology, `handleConsumerFailure` |
| users-service | same |
| companies-service | same |
| company-members-service | same |
| appointments-service | same |
| notifications-service | same |
| metrics-service | `connectManaged` only (no retry topology) |

**Standalone Dockerfiles work today** for: `outbox-publisher`, publisher-only domain
services, `dashboard-service`, `ai-service`, `rabbitmq-lab-service`.

## Pattern: build from repository root

```dockerfile
# syntax=docker/dockerfile:1
# Build context: repository root (not services/<name>/)
#
# Example for auth-service — adapt SERVICE and WORKSPACE names per deploy unit.

FROM node:22-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json yarn.lock ./
COPY frontend/package.json frontend/
COPY services/messaging-kit/package.json services/messaging-kit/
COPY services/auth-service/package.json services/auth-service/
# ... copy package.json for every workspace entry referenced by yarn.lock
RUN yarn install --frozen-lockfile

FROM deps AS build
COPY services/messaging-kit services/messaging-kit
COPY services/auth-service services/auth-service
RUN yarn workspace @crm/auth-service build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/auth-service/package.json ./
COPY --from=build /repo/services/auth-service/dist ./dist
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/services/messaging-kit ./node_modules/@crm/messaging-kit
# Or rely on yarn workspaces hoisting — verify @crm/messaging-kit resolves at runtime.

EXPOSE 4001
CMD ["node", "dist/main.js"]
```

A shared `docker/workspace-service.dockerfile` (repo root context, parameterized
`SERVICE` name) is the intended consolidation — wire into `docker/prod/compose.yml`
and `docker/smoke/compose.yml` when prod images are verified.

## Local dev (no Docker)

`yarn install` at repo root links `@crm/messaging-kit` for host-based `yarn dev` /
`yarn dev full`. No separate messaging-kit build step unless you run outside the
workspace layout.

## Related docs

- [dockerfile-standard.md](./dockerfile-standard.md) — standalone vs workspace exception
- [dev-orchestration.md](./dev-orchestration.md) — `yarn smoke:prod` caveat
- [docs/students/devops/prod/DEPLOY-STRATEGY.md](../students/devops/prod/DEPLOY-STRATEGY.md)
- [docs/students/rabitmq/common/22-connection-lifecycle.md](../students/rabitmq/common/22-connection-lifecycle.md)
