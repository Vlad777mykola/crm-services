import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Select, Space, Spin } from 'antd';
import { Link, useParams } from 'react-router';

import { fetchCompanySpecialists } from '@/features/company-specialists/api/companySpecialistsApi';
import {
  assignServiceSpecialist,
  fetchServiceSpecialists,
  unassignServiceSpecialist,
} from '@/features/service-specialists/api/serviceSpecialistsApi';
import { fetchServiceById } from '@/features/services/api/servicesApi';

export function ServiceSpecialistsPage() {
  const { companyId, serviceId } = useParams<{ companyId: string; serviceId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['service', serviceId, 'specialists'];
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: service } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: Boolean(serviceId),
  });

  const { data: assigned, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchServiceSpecialists(serviceId!),
    enabled: Boolean(serviceId),
  });

  const { data: companySpecialists } = useQuery({
    queryKey: ['company', companyId, 'specialists'],
    queryFn: () => fetchCompanySpecialists(companyId!),
    enabled: Boolean(companyId),
  });

  const assignMutation = useMutation({
    mutationFn: (specialistProfileId: string) => assignServiceSpecialist(serviceId!, specialistProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedSpecialistId(undefined);
    },
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to assign specialist');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (specialistProfileId: string) => unassignServiceSpecialist(serviceId!, specialistProfileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to remove specialist');
    },
  });

  const assignedIds = new Set((assigned ?? []).map((entry) => entry.specialistProfileId));
  const availableOptions = (companySpecialists ?? [])
    .filter((entry) => !assignedIds.has(entry.specialistProfileId) && entry.specialist)
    .map((entry) => ({ value: entry.specialistProfileId, label: entry.specialist!.displayName }));

  return (
    <Card
      title={service ? `Specialists for ${service.name}` : 'Service specialists'}
      extra={<Link to={`/company/${companyId}/services`}>Back to services</Link>}
      style={{ maxWidth: 640, margin: '2rem auto' }}
    >
      {actionError && <Alert type="error" message={actionError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setActionError(null)} />}

      <Space style={{ marginBottom: 24, width: '100%' }}>
        <Select
          showSearch
          placeholder="Select an active specialist to assign"
          style={{ width: 320 }}
          options={availableOptions}
          optionFilterProp="label"
          value={selectedSpecialistId}
          onChange={(value) => setSelectedSpecialistId(value)}
        />
        <Button
          type="primary"
          disabled={!selectedSpecialistId}
          loading={assignMutation.isPending}
          onClick={() => {
            setActionError(null);
            if (selectedSpecialistId) {
              assignMutation.mutate(selectedSpecialistId);
            }
          }}
        >
          Assign
        </Button>
      </Space>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load assigned specialists"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {assigned && assigned.length === 0 && <Empty description="No specialists assigned to this service yet" />}
      {assigned && assigned.length > 0 && (
        <List
          dataSource={assigned}
          renderItem={(entry) => (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  size="small"
                  danger
                  loading={unassignMutation.isPending}
                  onClick={() => {
                    setActionError(null);
                    unassignMutation.mutate(entry.specialistProfileId);
                  }}
                >
                  Remove
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  entry.specialist ? (
                    <Link to={`/specialists/${entry.specialist.id}`}>{entry.specialist.displayName}</Link>
                  ) : (
                    'Specialist'
                  )
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
