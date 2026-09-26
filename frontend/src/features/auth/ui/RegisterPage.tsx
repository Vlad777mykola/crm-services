import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Input, Typography } from '@/shared/ui';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/model/useAuth';
import { registerFormSchema, type RegisterFormValues } from '@/features/auth/model/schemas';
import { FormField } from '@/shared/ui/form/FormField';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', name: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser(values);
      navigate('/app');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    }
  });

  return (
    <Card title="Create an account" style={{ maxWidth: 400, margin: '4rem auto' }}>
      {formError && <Alert type="error" message={formError} style={{ marginBottom: 16 }} showIcon />}
      <form className="crm-form" onSubmit={onSubmit}>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="Name" error={fieldState.error?.message}>
              <Input {...field} autoComplete="name" status={fieldState.error ? 'error' : undefined} />
            </FormField>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="Email" error={fieldState.error?.message}>
              <Input {...field} type="email" autoComplete="email" status={fieldState.error ? 'error' : undefined} />
            </FormField>
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="Password" error={fieldState.error?.message}>
              <Input.Password {...field} autoComplete="new-password" status={fieldState.error ? 'error' : undefined} />
            </FormField>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Register
        </Button>
      </form>
      <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </Card>
  );
}
