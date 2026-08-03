import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Space, Spin, Tag } from 'antd';
import { Link } from 'react-router';

import {
  acceptSpecialistCompanyRequest,
  fetchMySpecialistCompanyRequests,
  rejectSpecialistCompanyRequest,
} from '@/features/company-specialists/api/companySpecialistsApi';

const STATUS_COLORS: Record<string, string> = {
  pending: 'gold',
  accepted: 'green',
  rejected: 'red',
  cancelled: 'default',
};

export function SpecialistCompanyRequestsPage() {
  const queryClient = useQueryClient();
  const queryKey = ['specialists', 'me', 'company-requests'];
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: requests, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchMySpecialistCompanyRequests,
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => acceptSpecialistCompanyRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to accept request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectSpecialistCompanyRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError: unknown) => {
      setActionError(mutationError instanceof Error ? mutationError.message : 'Failed to reject request');
    },
  });

  return (
    <Card
      title="Company requests"
      extra={<Link to="/specialist/companies">My companies</Link>}
      style={{ maxWidth: 640, margin: '2rem auto' }}
    >
      {actionError && <Alert type="error" message={actionError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setActionError(null)} />}
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load requests"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {requests && requests.length === 0 && <Empty description="No company has requested you yet" />}
      {requests && requests.length > 0 && (
        <List
          dataSource={requests}
          renderItem={(request) => (
            <List.Item
              extra={
                request.status === 'pending' ? (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      loading={acceptMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        acceptMutation.mutate(request.id);
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={rejectMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        rejectMutation.mutate(request.id);
                      }}
                    >
                      Reject
                    </Button>
                  </Space>
                ) : (
                  <Tag color={STATUS_COLORS[request.status]}>{request.status}</Tag>
                )
              }
            >
              <List.Item.Meta
                title={request.company?.name ?? 'Company'}
                description={request.message ?? 'No message'}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
