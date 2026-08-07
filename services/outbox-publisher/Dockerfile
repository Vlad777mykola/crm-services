# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, own dependency tree. Build context
# is this folder only (not the repo root), so this image can never depend on
# backend or frontend source. Build with:
#   docker build -f services/outbox-publisher/Dockerfile -t crm-outbox-publisher services/outbox-publisher

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

CMD ["node", "dist/main.js"]
