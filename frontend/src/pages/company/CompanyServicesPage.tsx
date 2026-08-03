import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Modal, Space, Spin, Tag } from 'antd';
import { useParams } from 'react-router';

import { createService, fetchCompanyServices, updateService, type Service } from '@/features/services/api/servicesApi';
import { ServiceForm } from '@/features/services/ui/ServiceForm';
import type { ServiceFormValues } from '@/features/services/model/schemas';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'green',
  suspended: 'red',
};

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function CompanyServicesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId, 'services'];
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: services, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyServices(companyId!),
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: (values: ServiceFormValues) =>
      createService(companyId!, {
        name: values.name,
        description: values.description || null,
        category: values.category || null,
        durationMinutes: values.durationMinutes,
        price: values.price || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCreateOpen(false);
    },
    onError: (mutationError: unknown) => {
      setFormError(mutationError instanceof Error ? mutationError.message : 'Failed to create service');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, values }: { serviceId: string; values: ServiceFormValues }) =>
      updateService(companyId!, serviceId, {
        name: values.name,
        description: values.description || null,
        category: values.category || null,
        durationMinutes: values.durationMinutes,
        price: values.price || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingService(null);
    },
    onError: (mutationError: unknown) => {
      setFormError(mutationError instanceof Error ? mutationError.message : 'Failed to update service');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (serviceId: string) => updateService(companyId!, serviceId, { status: 'published' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <Card
      title="Services"
      extra={
        <Button type="primary" onClick={() => { setFormError(null); setCreateOpen(true); }}>
          Add service
        </Button>
      }
      style={{ maxWidth: 720, margin: '2rem auto' }}
    >
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load services"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {services && services.length === 0 && <Empty description="No services yet" />}
      {services && services.length > 0 && (
        <List
          dataSource={services}
          renderItem={(service) => (
            <List.Item
              actions={[
                <Button key="edit" size="small" onClick={() => { setFormError(null); setEditingService(service); }}>
                  Edit
                </Button>,
                service.status === 'draft' ? (
                  <Button
                    key="publish"
                    size="small"
                    type="primary"
                    loading={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(service.id)}
                  >
                    Publish
                  </Button>
                ) : null,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {service.name}
                    <Tag color={STATUS_COLORS[service.status]}>{service.status}</Tag>
                  </Space>
                }
                description={
                  <>
                    {service.durationMinutes} min · {formatPrice(service.price)}
                    {service.category && ` · ${service.category}`}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title="Add a service"
        open={isCreateOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        {formError && <Alert type="error" message={formError} style={{ marginBottom: 16 }} showIcon />}
        <ServiceForm
          submitLabel="Create service"
          submitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </Modal>

      <Modal
        title={`Edit ${editingService?.name ?? 'service'}`}
        open={Boolean(editingService)}
        onCancel={() => setEditingService(null)}
        footer={null}
        destroyOnClose
      >
        {formError && <Alert type="error" message={formError} style={{ marginBottom: 16 }} showIcon />}
        {editingService && (
          <ServiceForm
            submitLabel="Save changes"
            submitting={updateMutation.isPending}
            defaultValues={{
              name: editingService.name,
              description: editingService.description ?? '',
              category: editingService.category ?? '',
              durationMinutes: editingService.durationMinutes,
              price: editingService.price ?? '',
            }}
            onSubmit={(values) => updateMutation.mutate({ serviceId: editingService.id, values })}
          />
        )}
      </Modal>
    </Card>
  );
}
