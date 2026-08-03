import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicSpecialists } from '@/features/specialists/api/specialistsApi';

export function SpecialistsListPage() {
  const { data: specialists, isLoading, isError, error } = useQuery({
    queryKey: ['specialists', 'public'],
    queryFn: fetchPublicSpecialists,
  });

  return (
    <Card title="Specialists" style={{ maxWidth: 720, margin: '2rem auto' }}>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load specialists"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {specialists && specialists.length === 0 && <Empty description="No published specialists yet" />}
      {specialists && specialists.length > 0 && (
        <List
          dataSource={specialists}
          renderItem={(specialist) => (
            <List.Item>
              <List.Item.Meta
                title={<Link to={`/specialists/${specialist.id}`}>{specialist.displayName}</Link>}
                description={
                  <>
                    {specialist.headline && <Typography.Text type="secondary">{specialist.headline}</Typography.Text>}
                    {specialist.category && <Typography.Text type="secondary"> · {specialist.category}</Typography.Text>}
                    {specialist.city && <Typography.Text type="secondary"> · {specialist.city}</Typography.Text>}
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
