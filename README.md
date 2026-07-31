# CRM Services

A single repository with **independently deployable** frontend and backend, connected only through a generated API contract (OpenAPI) — not through direct source imports.

## Structure

```
crm-services/
├── frontend/          # React + TypeScript + Vite app (deploys to GitHub Pages, later S3/CloudFront)
├── backend/           # Node.js + TypeScript + Express API (deploys as Docker service, later ECS/App Runner)
├── contracts/         # Generated openapi.json — the contract between frontend and backend
├── docker/            # docker-compose.yml and local dev infrastructure
├── .github/workflows/ # CI/CD pipelines (frontend, backend, contract-check run independently)
├── package.json       # Yarn workspaces root — orchestration only, no shared runtime code
└── yarn.lock
```

## Key rules

- Frontend never imports backend source code. It only consumes the generated API client/types produced from `contracts/openapi.json` (see Step 7, Orval).
- Backend Zod schemas are the single source of truth for request/response shapes; OpenAPI is generated from them (see Step 6).
- OpenAPI/Swagger is a development/build-time concern only — it is never required for the backend to run in production.
- Frontend and backend each have their own build, lint, typecheck, test, and deploy pipeline, and can be deployed independently of one another.

## Getting started

This repo uses **Yarn Classic (v1) Workspaces** with a single root lockfile. Workspaces keep day-to-day dependency management simple while each of `frontend/` and `backend/` remains independently buildable and deployable (each has its own scripts, its own Dockerfile/deploy workflow, and neither imports the other's source).

Install all dependencies (frontend + backend) in one step:

```bash
yarn install
```

> Note: there is intentionally no custom `install` script in `package.json`. `install` is a reserved lifecycle hook name in npm/Yarn; the built-in `yarn install` command already installs every workspace in a single pass.

Other root-level commands (delegate to the relevant workspace(s); these become fully functional as later steps add real scripts to `frontend`/`backend`):

```bash
yarn dev               # run frontend + backend dev servers together
yarn build              # build backend then frontend
yarn lint               # lint backend then frontend
yarn typecheck          # typecheck backend then frontend
yarn test               # test backend then frontend
yarn contract:generate  # regenerate contracts/openapi.json and the frontend API client
yarn contract:check     # regenerate contracts, then fail if anything changed (used in CI)
```

## Status

This repository is being built incrementally, one step at a time. Current state: **Step 1 — base repository structure** (folders, workspace wiring, root scripts). Frontend, backend, database, Docker, contracts, CI, and event-driven infrastructure are added in subsequent steps.
