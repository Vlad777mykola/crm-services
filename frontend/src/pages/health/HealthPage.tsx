import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin } from 'antd';

import { apiFetch } from '../../shared/api/client';

interface HealthResponse {
  status: string;
  uptime?: number;
  timestamp?: string;
}

function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health');
}

export function HealthPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <Card title="Backend Health" style={{ maxWidth: 480, margin: '2rem auto' }}>
      {isLoading && <Spin />}
      {isError && (
        <Alert
          type="error"
          message="Failed to reach backend"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {data && (
        <Descriptions column={1}>
          <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
          {data.uptime !== undefined && (
            <Descriptions.Item label="Uptime (s)">{data.uptime}</Descriptions.Item>
          )}
          {data.timestamp && <Descriptions.Item label="Timestamp">{data.timestamp}</Descriptions.Item>}
        </Descriptions>
      )}
    </Card>
  );
}
