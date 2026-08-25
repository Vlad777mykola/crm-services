import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Empty, List, Rate, Space, Spin, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router';

import { fetchSpecialistReviews } from '@/features/reviews/api/reviewsApi';
import { ReviewsList } from '@/features/reviews/ui/ReviewsList';
import { fetchSpecialistById } from '@/features/specialists/api/specialistsApi';

export function SpecialistPublicPage() {
  const { specialistId } = useParams<{ specialistId: string }>();

  const { data: specialist, isLoading, isError, error } = useQuery({
    queryKey: ['specialist', specialistId, 'public'],
    queryFn: () => fetchSpecialistById(specialistId!),
    enabled: Boolean(specialistId),
  });

  const { data: reviews } = useQuery({
    queryKey: ['specialist', specialistId, 'reviews'],
    queryFn: () => fetchSpecialistReviews(specialistId!),
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
    <Space direction="vertical" style={{ display: 'flex', maxWidth: 680, margin: '2rem auto' }} size="large">
      <Card
        title={specialist.displayName}
        extra={specialist.isRemoteSupported ? <Tag color="blue">Remote available</Tag> : null}
      >
        {specialist.headline && <Typography.Title level={5} style={{ marginTop: 0 }}>{specialist.headline}</Typography.Title>}
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Rate allowHalf disabled value={specialist.rating} style={{ fontSize: 16 }} />
          <Typography.Text type="secondary">
            {specialist.rating.toFixed(1)} ({specialist.reviewsCount} reviews)
          </Typography.Text>
        </Space>
        {specialist.bio && <Typography.Paragraph>{specialist.bio}</Typography.Paragraph>}
        <Descriptions column={1}>
          {specialist.category && <Descriptions.Item label="Category">{specialist.category}</Descriptions.Item>}
          {specialist.city && <Descriptions.Item label="City">{specialist.city}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card title="Choose where to book">
        {specialist.companies.length === 0 && <Empty description="No active companies yet" />}
        {specialist.companies.length > 0 && (
          <List
            dataSource={specialist.companies}
            renderItem={(company) => (
              <List.Item
                actions={[
                  <Link key="company" to={`/companies/${company.id}?specialistId=${specialist.id}`}>
                    <Button type="primary">View company</Button>
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={<Link to={`/companies/${company.id}`}>{company.name}</Link>}
                  description={
                    <Space size={[4, 4]} wrap>
                      {company.services.length === 0 && <Typography.Text type="secondary">No published services yet</Typography.Text>}
                      {company.services.map((service) => (
                        <Link key={service.id} to={`/services/${service.id}`}>
                          <Tag>{service.name}</Tag>
                        </Link>
                      ))}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="Reviews">
        <ReviewsList reviews={reviews ?? []} />
      </Card>
    </Space>
  );
}
