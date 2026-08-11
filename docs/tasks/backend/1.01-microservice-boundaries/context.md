# Context: Microservice import boundaries (backend)

**Task ID:** `1.01`  
**Area:** `backend`  
**Date:** `2026-08-11`

## Goal

Detect modular-monolith layout and add ESLint boundaries so **auth** and **permissions** are fully isolated (future microservices), with Nest-like per-module import rules.

## What was done

- Added `eslint-plugin-boundaries` and `eslint-import-resolver-typescript` to `backend/package.json`.
- Created `backend/eslint.microservice-boundaries.js` with auth, auth-public, permissions, domain-*, infrastructure, application elements.
- Wired in `backend/eslint.config.js` with `tsconfigRootDir` for path resolution.

## Key files

| Path | Role |
|------|------|
| `backend/eslint.microservice-boundaries.js` | Boundary elements and dependency policies |
| `backend/eslint.config.js` | Applies rules to `src/**/*.ts` |
| `backend/src/common/middleware/requireAuth.ts` | Auth public API for domain routes |
| `backend/src/common/permissions/companyPermissions.ts` | Permissions boundary |

## Architecture detected

```
src/
  app.ts, main.ts          # application
  infrastructure/          # DB, outbox, events
  common/auth/             # auth boundary (with modules/auth)
  common/permissions/      # permissions boundary
  modules/{domain}/        # future microservices
```

## Decisions & constraints

- Auth & permissions boundaries: **zero violations** after config tuning.
- Domain cross-module imports: **~65 errors** (TypeORM entities importing sibling entities) — expected monolith debt.
- `elements-single-match: false` + explicit `shared` subpaths so auth-public middleware is not classified as `shared`.
- Disallow auth imports uses explicit `from` type list (not `!auth` negation — OR semantics broke infrastructure).

## Commands verified

```bash
cd backend && npm run lint
```

Auth/permissions clean; domain cross-imports fail.

## Known debt / follow-ups

- Allow `domain-users` in all domain allow lists to reduce User-entity import noise.
- Set `boundaries/dependencies` to `warn` during migration.
- Extract cross-module entity refs to shared contracts before microservice split.

## Related tasks

- Frontend FSD boundaries: `docs/tasks/frontend/1.01-fsd-import-boundaries/context.md`

## References

- https://www.jsboundaries.dev/docs/quick-start/
- https://github.com/mattpocock/skills/tree/main/docs (task archive / writing-for-agents patterns)
