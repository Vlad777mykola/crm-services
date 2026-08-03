import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '../model/useAuth';
import { registerFormSchema, type RegisterFormValues } from '../model/schemas';

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
      <Form layout="vertical" onFinish={onSubmit}>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item label="Name" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} autoComplete="name" />
            </Form.Item>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item label="Email" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} type="email" autoComplete="email" />
            </Form.Item>
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="Password"
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input.Password {...field} autoComplete="new-password" />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" block loading={isSubmitting}>
          Register
        </Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </Card>
  );
}
