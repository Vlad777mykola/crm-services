import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, List, Space, Spin, Tag } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useParams } from 'react-router';

import {
  fetchCompanyMembers,
  inviteCompanyMember,
  removeCompanyMember,
  updateCompanyMemberStatus,
  type CompanyMember,
} from '@/features/company-members/api/companyMembersApi';
import { inviteMemberFormSchema, type InviteMemberFormValues } from '@/features/company-members/model/schemas';

export function CompanyMembersPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId, 'members'];
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: members, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyMembers(companyId!),
    enabled: Boolean(companyId),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberFormSchema),
    defaultValues: { email: '' },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteMemberFormValues) => inviteCompanyMember(companyId!, values.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      reset();
    },
    onError: (mutationError: unknown) => {
      setInviteError(mutationError instanceof Error ? mutationError.message : 'Failed to invite member');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: 'active' | 'removed' }) =>
      updateCompanyMemberStatus(companyId!, memberId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to update member');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeCompanyMember(companyId!, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to remove member');
    },
  });

  const onInvite = handleSubmit((values) => {
    setInviteError(null);
    inviteMutation.mutate(values);
  });

  const renderActions = (member: CompanyMember) => {
    if (member.role === 'owner') {
      return null;
    }

    if (member.status === 'removed') {
      return (
        <Button
          size="small"
          onClick={() => {
            setActionError(null);
            statusMutation.mutate({ memberId: member.id, status: 'active' });
          }}
        >
          Reactivate
        </Button>
      );
    }

    return (
      <Button
        size="small"
        danger
        onClick={() => {
          setActionError(null);
          removeMutation.mutate(member.id);
        }}
      >
        Remove
      </Button>
    );
  };

  return (
    <Card title="Company members" style={{ maxWidth: 640, margin: '2rem auto' }}>
      <Form layout="inline" onFinish={onInvite} style={{ marginBottom: 24 }}>
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              validateStatus={fieldState.error ? 'error' : ''}
              help={fieldState.error?.message}
              style={{ flex: 1, minWidth: 260 }}
            >
              <Input {...field} placeholder="Invite by email" />
            </Form.Item>
          )}
        />
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting || inviteMutation.isPending}>
            Invite as manager
          </Button>
        </Form.Item>
      </Form>

      {inviteError && <Alert type="error" message={inviteError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setInviteError(null)} />}
      {actionError && <Alert type="error" message={actionError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setActionError(null)} />}

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load members"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}

      {members && (
        <List
          dataSource={members}
          renderItem={(member) => (
            <List.Item actions={[renderActions(member)]}>
              <List.Item.Meta
                title={member.user.name}
                description={member.user.email}
              />
              <Space>
                <Tag color={member.role === 'owner' ? 'gold' : 'blue'}>{member.role}</Tag>
                <Tag color={member.status === 'active' ? 'green' : 'default'}>{member.status}</Tag>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
