# Context: FSD import boundaries (frontend)

**Task ID:** `1.01`  
**Area:** `frontend`  
**Date:** `2026-08-11`

## Goal

Enforce FSD layer import rules in the frontend so slices stay isolated and the codebase can scale with clear boundaries.

## What was done

- Added `eslint-plugin-boundaries` and `eslint-import-resolver-typescript` to `frontend/package.json`.
- Created `frontend/eslint.fsd-boundaries.js` with layer elements, policies, and `boundaries/dependencies` rule.
- Wired config in `frontend/eslint.config.js` (removed broken unfinished Prettier block).
- Ignored `src/main.tsx` from boundary checks (bootstrap entry).

## Key files

| Path | Role |
|------|------|
| `frontend/eslint.fsd-boundaries.js` | FSD layer definitions and import policies |
| `frontend/eslint.config.js` | Applies boundaries to `src/**/*.ts(x)` |
| `frontend/tsconfig.app.json` | `@/*` path alias for import resolver |

## Decisions & constraints

- Uses boundaries v7 API (`boundaries/dependencies`), not deprecated `element-types`.
- Layers without folders yet (`widgets`, `entities`) are still defined for future use.
- Cross-slice **feature** imports are errors — intentional FSD enforcement.

## Commands verified

```bash
cd frontend && npm run lint
```

Fails on 3 cross-slice feature imports (expected debt).

## Known debt / follow-ups

- `features/dashboard/api/dashboardApi.ts` → `features/companies`, `features/specialists`
- `features/profile/api/profileApi.ts` → `features/auth`
- Optional: add `@feature-sliced/eslint-config` public-api rules (`import/no-internal-modules`).

## Related tasks

- Backend mirror: `docs/tasks/backend/1.01-microservice-boundaries/context.md`

## References

- https://feature-sliced.design/docs/reference/layers/overview
- https://www.jsboundaries.dev/docs/quick-start/
