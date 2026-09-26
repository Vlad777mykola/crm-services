import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/model/useAuth';
import { loginFormSchema, type LoginFormValues } from '@/features/auth/model/schemas';
import { FormField } from '@/shared/ui/form/FormField';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      navigate('/app');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed');
    }
  });

  return (
    <Card title="Log in" style={{ maxWidth: 400, margin: '4rem auto' }}>
      {formError && <Alert type="error" message={formError} style={{ marginBottom: 16 }} showIcon />}
      <form className="crm-form" onSubmit={onSubmit}>
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
              <Input.Password {...field} autoComplete="current-password" status={fieldState.error ? 'error' : undefined} />
            </FormField>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Log in
        </Button>
      </form>
      <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </Typography.Paragraph>
    </Card>
  );
}
