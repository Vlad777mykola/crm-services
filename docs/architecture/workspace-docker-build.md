# Workspace-aware Docker build (Yarn Classic v1)

Build from **repository root** with focused workspace install:

```dockerfile
FROM node:22 AS build
WORKDIR /repo
COPY package.json yarn.lock ./
COPY frontend/package.json frontend/
COPY services/auth-service/package.json services/auth-service/
# ... all workspace package.json stubs
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn workspace @crm/auth-service build

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=build /repo/services/auth-service/dist ./dist
COPY --from=build /repo/services/auth-service/package.json ./
COPY --from=build /repo/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

See Phase 3 workspace migration in the orchestration plan.
