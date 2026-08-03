import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Form, Input, List, Select, Space } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';

import {
  fetchCompanySpecialists,
  sendSpecialistRequest,
} from '@/features/company-specialists/api/companySpecialistsApi';
import {
  sendSpecialistRequestFormSchema,
  type SendSpecialistRequestFormValues,
} from '@/features/company-specialists/model/schemas';
import { fetchPublicSpecialists } from '@/features/specialists/api/specialistsApi';

export function CompanySpecialistsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId, 'specialists'];
  const [requestError, setRequestError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: specialists, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanySpecialists(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: publicSpecialists } = useQuery({
    queryKey: ['specialists', 'public', 'invite-options'],
    queryFn: () => fetchPublicSpecialists({ pageSize: 50 }),
    select: (result) => result.items,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SendSpecialistRequestFormValues>({
    resolver: zodResolver(sendSpecialistRequestFormSchema),
    defaultValues: { specialistProfileId: '', message: '' },
  });

  const requestMutation = useMutation({
    mutationFn: (values: SendSpecialistRequestFormValues) =>
      sendSpecialistRequest(companyId!, {
        specialistProfileId: values.specialistProfileId,
        message: values.message || null,
      }),
    onSuccess: () => {
      setSuccessMessage('Request sent to the specialist');
      reset();
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'specialist-requests'] });
    },
    onError: (mutationError: unknown) => {
      setRequestError(mutationError instanceof Error ? mutationError.message : 'Failed to send request');
    },
  });

  const onSend = handleSubmit((values) => {
    setRequestError(null);
    setSuccessMessage(null);
    requestMutation.mutate(values);
  });

  const activeIds = new Set((specialists ?? []).map((entry) => entry.specialistProfileId));
  const availableOptions = (publicSpecialists ?? [])
    .filter((specialist) => !activeIds.has(specialist.id))
    .map((specialist) => ({ value: specialist.id, label: specialist.displayName }));

  return (
    <Space direction="vertical" style={{ display: 'flex', maxWidth: 640, margin: '2rem auto' }} size="large">
      <Card title="Request a specialist">
        {requestError && <Alert type="error" message={requestError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setRequestError(null)} />}
        {successMessage && <Alert type="success" message={successMessage} style={{ marginBottom: 16 }} showIcon closable onClose={() => setSuccessMessage(null)} />}
        <Form layout="vertical" onFinish={onSend}>
          <Controller
            name="specialistProfileId"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item label="Specialist" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
                <Select
                  {...field}
                  showSearch
                  placeholder="Select a published specialist"
                  options={availableOptions}
                  optionFilterProp="label"
                  value={field.value || undefined}
                />
              </Form.Item>
            )}
          />
          <Controller
            name="message"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item label="Message (optional)" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
                <Input.TextArea {...field} rows={3} placeholder="Tell them why you'd like them to join" />
              </Form.Item>
            )}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSubmitting || requestMutation.isPending}>
              Send request
            </Button>
          </Form.Item>
        </Form>
        <Link to={`/company/${companyId}/specialist-requests`}>View sent requests</Link>
      </Card>

      <Card title="Active specialists">
        {isLoading && <Empty description="Loading..." />}
        {isError && (
          <Alert
            type="error"
            message="Failed to load specialists"
            description={error instanceof Error ? error.message : 'Unknown error'}
          />
        )}
        {specialists && specialists.length === 0 && <Empty description="No active specialists yet" />}
        {specialists && specialists.length > 0 && (
          <List
            dataSource={specialists}
            renderItem={(entry) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    entry.specialist ? (
                      <Link to={`/specialists/${entry.specialist.id}`}>{entry.specialist.displayName}</Link>
                    ) : (
                      'Specialist'
                    )
                  }
                  description={`Working here since ${new Date(entry.startedAt).toLocaleDateString()}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
