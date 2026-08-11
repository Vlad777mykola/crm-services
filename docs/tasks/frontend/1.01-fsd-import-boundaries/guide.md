# FSD import boundaries (frontend)

## What this is

ESLint rules that enforce [Feature-Sliced Design](https://feature-sliced.design/) import layers in `frontend/src` using `eslint-plugin-boundaries`.

## When to use

- Adding a new FSD layer or slice — check allowed imports.
- CI fails on `boundaries/dependencies` — a layer is importing above or across slices.
- Onboarding — explains how frontend architecture is enforced.

## How it works

Layers (high → low): `app` → `pages` → `widgets` → `features` → `entities` → `shared`.

- A layer may only import **lower** layers (not sibling slices on the same layer).
- `app` and `shared` may import within their own layer.
- `_`-prefixed folders are god-mode (`gm_*`) for gradual migration.
- Same-slice imports are allowed (internal dependency rule).

Config lives in `frontend/eslint.fsd-boundaries.js`, applied in `frontend/eslint.config.js` for `src/**/*.{ts,tsx}`.

Path alias `@/*` is resolved via `eslint-import-resolver-typescript`.

## Commands

```bash
cd frontend
npm run lint
```

## For teammates

- **New slice** under `features/foo` — cannot import `features/bar`; move shared types to `entities` or `shared`.
- **Gradual adoption** — change rule severity to `warn` in `eslint.fsd-boundaries.js`.
- **Known violations** (as of 1.01): cross-slice feature imports in `dashboard` and `profile` APIs.

## Related

- Context for AI: [context.md](./context.md)
- Task ID: `1.01`
