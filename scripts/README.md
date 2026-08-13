# scripts

Developer tooling for local dev, verification, testing, and smoke checks.

## Setup

```powershell
yarn install
```

Installs all Yarn workspaces (`frontend`, `services/*`, `scripts/fill_dump_db`) from the repo root.

## Commands

| Area | Entry | Docs |
|------|-------|------|
| Daily dev | `yarn dev <feature>` | [`dev/README.md`](dev/README.md) |
| Startup gate | `yarn verify:startup` | [`verify/README.md`](verify/README.md) |
| Unit / integration / E2E | `yarn test:*` | [`test/README.md`](test/README.md) |
| Prod-parity smoke | `yarn smoke:prod` | [`smoke/README.md`](smoke/README.md) |
| DB seed / migrate | `yarn db:*` | [`db/README.md`](db/README.md) |

## Subfolders

- [`dev/`](dev/README.md) — intent-based `yarn dev`, features, infra, stop/status
- [`verify/`](verify/README.md) — isolated `verify:startup` matrix
- [`test/`](test/README.md) — isolated test stack (`:15432`, `:18080`)
- [`smoke/`](smoke/README.md) — minimal prod Dockerfile smoke (`:35432`, `:38080`)
- [`fill_dump_db/`](fill_dump_db/README.md) — Postgres seeds and migrations
- [`process/`](process/) — spawn, signal cleanup, Windows process-tree kill (shared by runners)
