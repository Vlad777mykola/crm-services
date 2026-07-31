# syntax=docker/dockerfile:1
#
# Local-parity/tools container only. Real production deploys go to GitHub Pages
# (Step 11) and later S3 + CloudFront - this image is not the primary deploy path.
# Build context is the repository root. Build with:
#   docker build -f frontend/Dockerfile -t crm-frontend .

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN yarn install --frozen-lockfile
COPY frontend ./frontend
RUN yarn workspace @crm/frontend build

FROM nginx:alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
