import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin, Tag } from 'antd';
import { useParams } from 'react-router';

import { fetchCompanySpecialistRequests } from '@/features/company-specialists/api/companySpecialistsApi';

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  accepted: 'green',
  rejected: 'red',
  cancelled: 'default',
};

export function CompanySpecialistRequestsPage() {
  const { companyId } = useParams<{ companyId: string }>();

  const { data: requests, isLoading, isError, error } = useQuery({
    queryKey: ['company', companyId, 'specialist-requests'],
    queryFn: () => fetchCompanySpecialistRequests(companyId!),
    enabled: Boolean(companyId),
  });

  return (
    <Card title="Sent specialist requests" style={{ maxWidth: 640, margin: '2rem auto' }}>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load requests"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {requests && requests.length === 0 && <Empty description="You haven't sent any requests yet" />}
      {requests && requests.length > 0 && (
        <List
          dataSource={requests}
          renderItem={(request) => (
            <List.Item extra={<Tag color={STATUS_COLORS[request.status]}>{request.status}</Tag>}>
              <List.Item.Meta
                title={request.specialist?.displayName ?? 'Specialist'}
                description={request.message ?? 'No message'}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
