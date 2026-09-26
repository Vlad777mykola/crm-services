# Form Facade

## Rule

Application code MUST import form primitives from `@/shared/form`.

DO NOT import React Hook Form directly in feature, page, widget, entity, or app code.

DO NOT import `@hookform/resolvers/zod` outside `frontend/src/shared/form`.

## Required

Use:

```ts
import { AppController, FormField, useAppForm } from '@/shared/form';
```

Do not use:

```ts
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
```

## Facade Scope

- `shared/form` owns the React Hook Form dependency.
- `shared/form` owns Zod resolver setup.
- `shared/form` owns project-level form wrappers such as `FormField`.
- Feature code MAY use app-level form concepts such as `useAppForm`, `AppController`, `AppFormProvider`, and `FormField`.
- Keep the facade thin.
- DO NOT build a universal abstraction over every form-library API.

## Required Pattern

```ts
const form = useAppForm<FormValues>({
  schema: formSchema,
  defaultValues,
});
```

```tsx
<AppController
  name="name"
  control={form.control}
  render={({ field, fieldState }) => (
    <FormField label="Name" error={fieldState.error?.message}>
      <Input {...field} status={fieldState.error ? 'error' : undefined} />
    </FormField>
  )}
/>
```

## Boundaries

- `shared/form` depends on React Hook Form and Zod resolver.
- `shared/form` may depend on `shared/ui` only when creating reusable semantic form controls.
- Feature code depends on `shared/form` and `shared/ui`.
- Feature code MUST NOT depend directly on React Hook Form internals.
