# syntax=docker/dockerfile:1
#
# Standalone service - own package.json, own dependency tree, own database
# access. Build context is this folder only (not the repo root), and it never
# imports backend source. Build with:
#   docker build -f services/users-service/Dockerfile -t crm-users-service services/users-service

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

EXPOSE 4002
CMD ["node", "dist/main.js"]
