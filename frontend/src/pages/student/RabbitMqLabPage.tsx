import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Input, Space, Typography } from 'antd';
import { useState } from 'react';

import { getApiUrl } from '@/shared/lib/env';

const LAB_BASE = '/rabbitmq-lab/api/lab';

async function labFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${LAB_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

interface LabStatus {
  rabbitmqReady: boolean;
  databaseReady: boolean;
  companiesObserver?: { observed: Array<{ entry: { eventType?: string; routingKey: string } }> };
  hello?: { received: Array<{ message: string }> };
}

export function RabbitMqLabPage() {
  const [helloMessage, setHelloMessage] = useState('hello from student UI');
  const [topicKey, setTopicKey] = useState('company.created');

  const statusQuery = useQuery({
    queryKey: ['rabbitmq-lab-status'],
    queryFn: () => labFetch<LabStatus>('/status'),
    refetchInterval: 3000,
  });

  const helloMutation = useMutation({
    mutationFn: () => labFetch('/hello', { method: 'POST', body: JSON.stringify({ message: helloMessage }) }),
    onSuccess: () => void statusQuery.refetch(),
  });

  const topicMutation = useMutation({
    mutationFn: () => labFetch('/topic', { method: 'POST', body: JSON.stringify({ routingKey: topicKey }) }),
    onSuccess: () => void statusQuery.refetch(),
  });

  if (import.meta.env.VITE_ENABLE_RABBITMQ_LAB !== 'true') {
    return (
      <Card title="RabbitMQ Lab" style={{ maxWidth: 720, margin: '2rem auto' }}>
        <Alert
          type="info"
          message="Student lab UI is disabled"
          description="Set VITE_ENABLE_RABBITMQ_LAB=true in frontend/.env and restart the dev server. Also run yarn dev:rabbitmq-lab."
        />
      </Card>
    );
  }

  const status = statusQuery.data;

  return (
    <div style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
      <Typography.Title level={2}>RabbitMQ Lab</Typography.Title>
      <Typography.Paragraph type="secondary">
        Dev-only page. Calls the gateway at <code>{getApiUrl()}{LAB_BASE}</code> — no RabbitMQ credentials in the browser.
      </Typography.Paragraph>

      {statusQuery.isError && (
        <Alert type="error" message="Cannot reach rabbitmq-lab-service" description="Start yarn dev:infra and yarn dev:rabbitmq-lab." />
      )}

      {status && (
        <Card title="Connection" style={{ marginBottom: 16 }}>
          <Descriptions column={2}>
            <Descriptions.Item label="RabbitMQ">{status.rabbitmqReady ? 'READY' : 'NOT READY'}</Descriptions.Item>
            <Descriptions.Item label="Database">{status.databaseReady ? 'READY' : 'NOT READY'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="Publish" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={helloMessage} onChange={(e) => setHelloMessage(e.target.value)} />
            <Button type="primary" loading={helloMutation.isPending} onClick={() => helloMutation.mutate()}>
              Hello lab
            </Button>
          </Space.Compact>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={topicKey} onChange={(e) => setTopicKey(e.target.value)} />
            <Button loading={topicMutation.isPending} onClick={() => topicMutation.mutate()}>
              Topic publish
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      <Card title="Received messages (snapshot)">
        <Typography.Text strong>Hello lab</Typography.Text>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(status?.hello?.received ?? [], null, 2)}</pre>
        <Typography.Text strong>Real company events observed</Typography.Text>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(status?.companiesObserver?.observed ?? [], null, 2)}
        </pre>
      </Card>
    </div>
  );
}
