# syntax=docker/dockerfile:1
#
# Build context is the repository root (required so Yarn workspaces can resolve
# the shared root lockfile). Build with:
#   docker build -f backend/Dockerfile -t crm-backend .

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN yarn install --frozen-lockfile

FROM deps AS build
COPY backend ./backend
RUN yarn workspace @crm/backend build

FROM base AS production
ENV NODE_ENV=production
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN yarn install --frozen-lockfile --production --ignore-scripts
COPY --from=build /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/main.js"]
