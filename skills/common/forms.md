# Forms

## Rule

MUST use React Hook Form for form state.

MUST use Zod for form validation schemas.

MUST use `@hookform/resolvers/zod` to connect Zod schemas to React Hook Form.

MUST use UI components from `@/shared/ui`.

MUST NOT use Ant Design `Form` or `Form.Item`.

MUST NOT import form controls directly from `antd` outside `shared/ui`.

## Required Pattern

Use:

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues,
});
```

Use `Controller` for controlled UI components:

```tsx
<Controller
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
- React Hook Form owns form state, submit state, dirty state, reset, and field registration.
- TanStack Query owns API mutations and server state.
- `@/shared/ui` owns presentation components.
- `FormField` owns project-level label, spacing, and error display.

## Do Not Use

- DO NOT use Ant Design `Form`.
- DO NOT use Ant Design `Form.Item`.
- DO NOT use Ant Design validation rules.
- DO NOT couple feature form state to a UI library.
