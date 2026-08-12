# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, own dependency tree, own database
# access. Build context is this folder only (not the repo root), and it never
# imports backend source. Build with:
#   docker build -f services/services-catalog-service/Dockerfile -t crm-services-catalog-service services/services-catalog-service

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

EXPOSE 4007
CMD ["node", "dist/main.js"]
