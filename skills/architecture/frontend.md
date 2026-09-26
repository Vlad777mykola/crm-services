# Frontend Architecture

## Rules

- MUST follow Feature-Sliced Design layers: `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
- MUST keep dependency direction top-to-bottom only.
- MUST place API calls in the owning feature API segment.
- MUST use TanStack Query for server state.
- MUST use React Hook Form + Zod for forms.
- MUST import reusable UI components from `@/shared/ui`.
- MUST NOT import `antd` outside `frontend/src/shared/ui`.
- MUST NOT use Ant Design `Form` or `Form.Item`.

## Placement

- Feature behavior belongs in `features/<feature>/model`.
- Feature API calls belong in `features/<feature>/api`.
- Feature-specific UI belongs in `features/<feature>/ui`.
- Shared reusable UI belongs in `shared/ui`.
- Page composition belongs in `pages`.
