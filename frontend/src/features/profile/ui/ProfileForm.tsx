import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, Spin } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { fetchMyProfile, updateMyProfile } from '@/features/profile/api/profileApi';
import { profileFormSchema, type ProfileFormValues } from '@/features/profile/model/schemas';

const PROFILE_QUERY_KEY = ['profile', 'me'];

export function ProfileForm() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchMyProfile,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', phone: '', city: '', bio: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        phone: profile.phone ?? '',
        city: profile.city ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateMyProfile({
        name: values.name,
        phone: values.phone || null,
        city: values.city || null,
        bio: values.bio || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updated);
      setSuccessMessage('Profile updated');
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSuccessMessage(null);
    mutation.mutate(values);
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load profile"
        description={error instanceof Error ? error.message : 'Unknown error'}
      />
    );
  }

  return (
    <Card title="My profile" style={{ maxWidth: 480, margin: '2rem auto' }}>
      {successMessage && <Alert type="success" message={successMessage} style={{ marginBottom: 16 }} showIcon />}
      {mutation.isError && (
        <Alert
          type="error"
          message={mutation.error instanceof Error ? mutation.error.message : 'Failed to update profile'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form layout="vertical" onFinish={onSubmit}>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item label="Name" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} />
            </Form.Item>
          )}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="Phone"
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
            >
              <Input {...field} />
            </Form.Item>
          )}
        />
        <Controller
          name="city"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item label="City" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input {...field} />
            </Form.Item>
          )}
        />
        <Controller
          name="bio"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item label="Bio" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
              <Input.TextArea {...field} rows={4} />
            </Form.Item>
          )}
        />
        <Button type="primary" htmlType="submit" loading={isSubmitting || mutation.isPending} disabled={!isDirty}>
          Save changes
        </Button>
      </Form>
    </Card>
  );
}
