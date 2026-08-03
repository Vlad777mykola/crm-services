import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin, Tag, Typography } from 'antd';
import { useParams } from 'react-router';

import { fetchSpecialistById } from '@/features/specialists/api/specialistsApi';

export function SpecialistPublicPage() {
  const { specialistId } = useParams<{ specialistId: string }>();

  const { data: specialist, isLoading, isError, error } = useQuery({
    queryKey: ['specialist', specialistId, 'public'],
    queryFn: () => fetchSpecialistById(specialistId!),
    enabled: Boolean(specialistId),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !specialist) {
    return (
      <Alert
        type="error"
        message="Specialist not found"
        description={error instanceof Error ? error.message : 'This profile may not be published yet.'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <Card
      title={specialist.displayName}
      extra={specialist.isRemoteSupported ? <Tag color="blue">Remote available</Tag> : null}
      style={{ maxWidth: 560, margin: '2rem auto' }}
    >
      {specialist.headline && <Typography.Title level={5} style={{ marginTop: 0 }}>{specialist.headline}</Typography.Title>}
      {specialist.bio && <Typography.Paragraph>{specialist.bio}</Typography.Paragraph>}
      <Descriptions column={1}>
        {specialist.category && <Descriptions.Item label="Category">{specialist.category}</Descriptions.Item>}
        {specialist.city && <Descriptions.Item label="City">{specialist.city}</Descriptions.Item>}
      </Descriptions>
    </Card>
  );
}
