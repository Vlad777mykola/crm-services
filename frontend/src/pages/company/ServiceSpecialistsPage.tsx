import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Select, Space, Spin, Typography } from 'antd';
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
  const [selectedSpecialistIds, setSelectedSpecialistIds] = useState<string[]>([]);
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

  const {
    data: companySpecialists,
    isLoading: isLoadingCompanySpecialists,
    isError: isCompanySpecialistsError,
    error: companySpecialistsError,
  } = useQuery({
    queryKey: ['company', companyId, 'specialists'],
    queryFn: () => fetchCompanySpecialists(companyId!),
    enabled: Boolean(companyId),
  });

  // Assigned one at a time rather than in parallel so a rejection can be
  // attributed to the specialist that caused it - the API has no bulk endpoint.
  const assignMutation = useMutation({
    mutationFn: async (specialistProfileIds: string[]) => {
      const failures: string[] = [];
      for (const specialistProfileId of specialistProfileIds) {
        try {
          await assignServiceSpecialist(serviceId!, specialistProfileId);
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'assignment failed';
          failures.push(`${labelFor(specialistProfileId)}: ${reason}`);
        }
      }
      return failures;
    },
    onSuccess: (failures) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'services'] });
      setSelectedSpecialistIds([]);
      setActionError(failures.length > 0 ? failures.join(' · ') : null);
    },
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to assign specialists');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (specialistProfileId: string) => unassignServiceSpecialist(serviceId!, specialistProfileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['company', companyId, 'services'] });
    },
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to remove specialist');
    },
  });

  const assignedIds = new Set((assigned ?? []).map((entry) => entry.specialistProfileId));
  const activeCompanySpecialists = (companySpecialists ?? []).filter((entry) => entry.status === 'active');

  function labelFor(specialistProfileId: string): string {
    const match = activeCompanySpecialists.find((entry) => entry.specialistProfileId === specialistProfileId);
    return match?.specialist?.displayName ?? 'Specialist';
  }

  const availableOptions = activeCompanySpecialists
    .filter((entry) => !assignedIds.has(entry.specialistProfileId))
    .map((entry) => ({
      value: entry.specialistProfileId,
      label: entry.specialist?.displayName ?? 'Specialist',
    }));

  return (
    <Card
      title={service ? `Specialists for ${service.name}` : 'Service specialists'}
      extra={<Link to={`/company/${companyId}/services`}>Back to services</Link>}
      style={{ maxWidth: 640, margin: '2rem auto' }}
    >
      {actionError && <Alert type="error" message={actionError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setActionError(null)} />}
      {isCompanySpecialistsError && (
        <Alert
          type="error"
          message="Failed to load company specialists"
          description={companySpecialistsError instanceof Error ? companySpecialistsError.message : 'Unknown error'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      {!isLoadingCompanySpecialists && !isCompanySpecialistsError && availableOptions.length === 0 && (
        <Alert
          type="info"
          message={
            activeCompanySpecialists.length === 0
              ? 'No active specialists in this company yet'
              : 'All active company specialists are already assigned to this service'
          }
          description={
            activeCompanySpecialists.length === 0 ? (
              <Link to={`/company/${companyId}/specialists`}>Add specialists to your company first</Link>
            ) : undefined
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Space style={{ marginBottom: 24, width: '100%' }} align="start">
        <Select
          mode="multiple"
          allowClear
          showSearch
          placeholder="Select one or more active specialists to assign"
          style={{ width: 360 }}
          maxTagCount="responsive"
          options={availableOptions}
          optionFilterProp="label"
          value={selectedSpecialistIds}
          onChange={(values: string[]) => setSelectedSpecialistIds(values)}
          loading={isLoadingCompanySpecialists}
          disabled={isLoadingCompanySpecialists || availableOptions.length === 0}
        />
        <Button
          type="primary"
          disabled={selectedSpecialistIds.length === 0}
          loading={assignMutation.isPending}
          onClick={() => {
            setActionError(null);
            if (selectedSpecialistIds.length > 0) {
              assignMutation.mutate(selectedSpecialistIds);
            }
          }}
        >
          {selectedSpecialistIds.length > 1 ? `Assign ${selectedSpecialistIds.length}` : 'Assign'}
        </Button>
        {availableOptions.length > 1 && (
          <Button
            onClick={() => setSelectedSpecialistIds(availableOptions.map((option) => option.value))}
            disabled={selectedSpecialistIds.length === availableOptions.length}
          >
            Select all
          </Button>
        )}
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
          header={
            <Typography.Text strong>
              {assigned.length} {assigned.length === 1 ? 'specialist' : 'specialists'} assigned
            </Typography.Text>
          }
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
