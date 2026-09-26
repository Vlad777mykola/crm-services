# Forms

## Rule

MUST use React Hook Form for form state.

MUST use Zod for form validation schemas.

MUST use `@/shared/form` for form primitives.

MUST use UI components from `@/shared/ui`.

MUST NOT use Ant Design `Form` or `Form.Item`.

MUST NOT import form controls directly from `antd` outside `shared/ui`.

MUST NOT import `react-hook-form` or `@hookform/resolvers/zod` outside `shared/form`.

## Required Pattern

Use:

```ts
const form = useAppForm<FormValues>({
  schema,
  defaultValues,
});
```

Use `AppController` for controlled UI components:

```tsx
<AppController
  name="name"
  control={control}
  render={({ field, fieldState }) => (
    <FormField label="Name" error={fieldState.error?.message}>
      <Input {...field} status={fieldState.error ? 'error' : undefined} />
    </FormField>
  )}
/>
```

Use native form submission:

```tsx
<form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
```

## Responsibilities

- Zod owns validation.
- `shared/form` owns React Hook Form setup.
- React Hook Form remains the underlying form-state library.
- TanStack Query owns API mutations and server state.
- `@/shared/ui` owns presentation components.
- `FormField` owns project-level label, spacing, and error display.

## Do Not Use

- DO NOT use Ant Design `Form`.
- DO NOT use Ant Design `Form.Item`.
- DO NOT use Ant Design validation rules.
- DO NOT couple feature form state to a UI library.
- DO NOT import React Hook Form directly outside `shared/form`.
