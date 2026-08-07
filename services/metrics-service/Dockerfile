# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, no database dependency at all.
# Build context is this folder only (not the repo root). Build with:
#   docker build -f services/metrics-service/Dockerfile -t crm-metrics-service services/metrics-service

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

EXPOSE 4100
CMD ["node", "dist/main.js"]
