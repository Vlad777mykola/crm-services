# syntax=docker/dockerfile:1
#
# STUDENT/DEV-ONLY. This image exists only so the lab can optionally be run
# in a container the same way other services can; it is intentionally NOT
# referenced from docker/dev/compose.services.yml or any docker/prod/*.yml.
# Do not add it there - see docs/students/rabitmq/lab-service/START-HERE.md
# ("must not be deployed as a production CRM business service").
#
# Standalone service - own package.json, no database dependency at all.
# Build context is this folder only (not the repo root). Build with:
#   docker build -f services/rabbitmq-lab-service/Dockerfile -t crm-rabbitmq-lab-service services/rabbitmq-lab-service

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

EXPOSE 4011
CMD ["node", "dist/main.js"]
