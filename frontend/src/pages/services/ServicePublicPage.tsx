import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin, Typography } from 'antd';
import { Link, useParams } from 'react-router';

import { fetchServiceById } from '@/features/services/api/servicesApi';

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function ServicePublicPage() {
  const { serviceId } = useParams<{ serviceId: string }>();

  const { data: service, isLoading, isError, error } = useQuery({
    queryKey: ['service', serviceId, 'public'],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: Boolean(serviceId),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !service) {
    return (
      <Alert
        type="error"
        message="Service not found"
        description={error instanceof Error ? error.message : 'This service may not be published yet.'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <Card title={service.name} style={{ maxWidth: 560, margin: '2rem auto' }}>
      {service.description && <Typography.Paragraph>{service.description}</Typography.Paragraph>}
      <Descriptions column={1}>
        <Descriptions.Item label="Duration">{service.durationMinutes} min</Descriptions.Item>
        <Descriptions.Item label="Price">{formatPrice(service.price)}</Descriptions.Item>
        {service.category && <Descriptions.Item label="Category">{service.category}</Descriptions.Item>}
        {service.company && (
          <Descriptions.Item label="Company">
            <Link to={`/companies/${service.company.id}`}>{service.company.name}</Link>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
