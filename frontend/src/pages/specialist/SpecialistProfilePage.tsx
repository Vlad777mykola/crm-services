import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Spin, Tag } from 'antd';

import {
  createMySpecialistProfile,
  fetchMySpecialistProfile,
  updateMySpecialistProfile,
} from '@/features/specialists/api/specialistsApi';
import { SpecialistProfileForm } from '@/features/specialists/ui/SpecialistProfileForm';
import type { SpecialistProfileFormValues } from '@/features/specialists/model/schemas';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'green',
  suspended: 'red',
};

export function SpecialistProfilePage() {
  const queryClient = useQueryClient();
  const queryKey = ['specialists', 'me'];
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchMySpecialistProfile,
  });

  const createMutation = useMutation({
    mutationFn: (values: SpecialistProfileFormValues) =>
      createMySpecialistProfile({
        displayName: values.displayName,
        headline: values.headline || null,
        bio: values.bio || null,
        category: values.category || null,
        city: values.city || null,
        isRemoteSupported: values.isRemoteSupported,
      }),
    onSuccess: (created) => queryClient.setQueryData(queryKey, created),
  });

  const updateMutation = useMutation({
    mutationFn: (values: SpecialistProfileFormValues) =>
      updateMySpecialistProfile({
        displayName: values.displayName,
        headline: values.headline || null,
        bio: values.bio || null,
        category: values.category || null,
        city: values.city || null,
        isRemoteSupported: values.isRemoteSupported,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setSuccessMessage('Specialist profile updated');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => updateMySpecialistProfile({ status: 'published' }),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load specialist profile"
        description={error instanceof Error ? error.message : 'Unknown error'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  if (!profile) {
    return (
      <Card title="Become a specialist" style={{ maxWidth: 560, margin: '2rem auto' }}>
        {createMutation.isError && (
          <Alert
            type="error"
            message={createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create profile'}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        <SpecialistProfileForm
          submitLabel="Create specialist profile"
          submitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </Card>
    );
  }

  return (
    <Card
      title="My specialist profile"
      extra={<Tag color={STATUS_COLORS[profile.status]}>{profile.status}</Tag>}
      style={{ maxWidth: 560, margin: '2rem auto' }}
    >
      {successMessage && <Alert type="success" message={successMessage} style={{ marginBottom: 16 }} showIcon />}
      {updateMutation.isError && (
        <Alert
          type="error"
          message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update profile'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      {publishMutation.isError && (
        <Alert
          type="error"
          message={publishMutation.error instanceof Error ? publishMutation.error.message : 'Failed to publish profile'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      {profile.status === 'draft' && (
        <Button
          type="primary"
          style={{ marginBottom: 16 }}
          loading={publishMutation.isPending}
          onClick={() => publishMutation.mutate()}
        >
          Publish profile
        </Button>
      )}
      <SpecialistProfileForm
        submitLabel="Save changes"
        submitting={updateMutation.isPending}
        defaultValues={{
          displayName: profile.displayName,
          headline: profile.headline ?? '',
          bio: profile.bio ?? '',
          category: profile.category ?? '',
          city: profile.city ?? '',
          isRemoteSupported: profile.isRemoteSupported,
        }}
        onSubmit={(values) => {
          setSuccessMessage(null);
          updateMutation.mutate(values);
        }}
      />
    </Card>
  );
}
