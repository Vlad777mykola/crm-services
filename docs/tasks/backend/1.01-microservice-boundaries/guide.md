# Microservice import boundaries (backend)

## What this is

ESLint rules that enforce **modular monolith** boundaries in `backend/src` — Nest-style domain modules with strict **auth** and **permissions** isolation for future microservice extraction.

## When to use

- Adding a new domain module under `backend/src/modules/`.
- Something imports `modules/auth` or `common/auth` directly — should use `requireAuth` middleware instead.
- Planning to split auth or permissions into separate services.

## How it works

| Boundary | Location | Others may import |
|----------|----------|-------------------|
| **auth** | `modules/auth`, `common/auth` | Only auth itself, auth-public middleware, infrastructure |
| **auth-public** | `requireAuth.ts`, `optionalAuth.ts` | Any domain module (public API) |
| **permissions** | `common/permissions` | Domain modules; cannot import auth |
| **domain-*** | `modules/{name}` | Own module + shared + auth-public + permissions |
| **infrastructure** | `infrastructure/` | Registers all entities (god mode) |

Domain modules **cannot** import sibling modules (TypeORM entity coupling currently causes ~65 lint errors).

Config: `backend/eslint.microservice-boundaries.js` → `backend/eslint.config.js`.

## Commands

```bash
cd backend
npm run lint
```

## For teammates

- Use `requireAuth` from `@/common/middleware/requireAuth.js` — never `@/common/auth/jwt` in domain code.
- Use `requireCompanyRole` from `@/common/permissions/companyPermissions.js` for company RBAC.
- Cross-module entity imports are flagged — fix over time (shared types, events, or APIs).

## Related

- Context for AI: [context.md](./context.md)
- Task ID: `1.01`
