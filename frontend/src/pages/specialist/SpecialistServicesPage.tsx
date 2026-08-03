import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin } from 'antd';
import { Link } from 'react-router';

import { fetchMySpecialistServices } from '@/features/service-specialists/api/serviceSpecialistsApi';

export function SpecialistServicesPage() {
  const { data: services, isLoading, isError, error } = useQuery({
    queryKey: ['specialists', 'me', 'services'],
    queryFn: fetchMySpecialistServices,
  });

  return (
    <Card
      title="Services you perform"
      extra={<Link to="/specialist/companies">My companies</Link>}
      style={{ maxWidth: 640, margin: '2rem auto' }}
    >
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load services"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {services && services.length === 0 && <Empty description="You're not assigned to any services yet" />}
      {services && services.length > 0 && (
        <List
          dataSource={services}
          renderItem={(entry) => (
            <List.Item>
              <List.Item.Meta
                title={entry.service ? <Link to={`/services/${entry.service.id}`}>{entry.service.name}</Link> : 'Service'}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
