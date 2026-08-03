import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicServices } from '@/features/services/api/servicesApi';

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function ServicesListPage() {
  const { data: services, isLoading, isError, error } = useQuery({
    queryKey: ['services', 'public'],
    queryFn: fetchPublicServices,
  });

  return (
    <Card title="Services" style={{ maxWidth: 720, margin: '2rem auto' }}>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load services"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {services && services.length === 0 && <Empty description="No published services yet" />}
      {services && services.length > 0 && (
        <List
          dataSource={services}
          renderItem={(service) => (
            <List.Item>
              <List.Item.Meta
                title={<Link to={`/services/${service.id}`}>{service.name}</Link>}
                description={
                  <>
                    {service.company && (
                      <>
                        <Link to={`/companies/${service.company.id}`}>{service.company.name}</Link> ·{' '}
                      </>
                    )}
                    {service.durationMinutes} min · {formatPrice(service.price)}
                    {service.category && (
                      <Typography.Text type="secondary"> · {service.category}</Typography.Text>
                    )}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
