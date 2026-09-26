# UI Library

## Rule

MUST NOT import UI library components directly in application code.

MUST import reusable UI components from the project UI facade:

```ts
import { Button, Input, Select } from '@/shared/ui';
```

DO NOT USE:

```ts
import { Button, Input, Select } from 'antd';
```

## Facade Rules

- UI library implementation belongs inside `frontend/src/shared/ui`.
- Direct `antd` imports are allowed ONLY inside `frontend/src/shared/ui`.
- Feature, page, widget, entity, and app code MUST depend on `@/shared/ui`.
- Add reusable UI behavior to `shared/ui`, not individual features.
- Prefer project-level semantic props when adding wrappers.
- DO NOT expose library-specific details from new shared wrappers when a project-level semantic API can express the intent.

## Exception

Direct UI-library imports are allowed only inside `frontend/src/shared/ui`.
