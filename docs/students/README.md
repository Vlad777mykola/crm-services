# Student documentation

Guides for running, testing, and deploying the CRM Services monorepo.

## Start here

| Doc | What it covers |
| --- | -------------- |
| [**DevOps guide**](./devops/README.md) | How it works, dependencies, learning path — **read this first** |
| [**RabbitMQ & messaging**](./rabitmq/README.md) | Events, outbox, consumers, routing, DLQ |

---

## DevOps — step by step

### 1. Understand the system

→ [devops/README.md](./devops/README.md) — what depends on what, port isolation, why it matters

### 2. Dev (local coding)

| File | Purpose |
| ---- | ------- |
| [devops/dev/RUN.md](./devops/dev/RUN.md) | Start dev, full dev, features, health checks |
| [devops/dev/DEBUG.md](./devops/dev/DEBUG.md) | Fix local startup, seeds, events, ports |

### 3. Test (automated checks)

| File | Purpose |
| ---- | ------- |
| [devops/test/RUN.md](./devops/test/RUN.md) | Unit, integration, E2E, verify, CI locally |
| [devops/test/DEBUG.md](./devops/test/DEBUG.md) | Fix failing tests and isolated stacks |

### 4. Prod (deploy)

| File | Purpose |
| ---- | ------- |
| [devops/prod/DEPLOY-STRATEGY.md](./devops/prod/DEPLOY-STRATEGY.md) | Architecture, secrets, rollout — **read before deploying** |
| [devops/prod/RUN.md](./devops/prod/RUN.md) | Smoke, env setup, compose up, smoke checks |
| [devops/prod/DEBUG.md](./devops/prod/DEBUG.md) | Fix prod/smoke deployment issues |

---

## Quick commands

```powershell
yarn install && yarn dev check     # one-time setup
yarn dev                           # minimal dev (companies + frontend)
yarn dev full --fresh              # full stack + DB reset + seed
yarn test                          # unit tests (no Docker)
yarn test:integration              # isolated integration stack
yarn verify:startup                # CI startup gate
yarn smoke:prod                    # prod Dockerfile smoke
```

---

## Legacy single-file runbook

The original combined runbook moved to split files under [devops/](./devops/). See [build-dev-test-prod.md](./build-dev-test-prod.md) for a redirect.
