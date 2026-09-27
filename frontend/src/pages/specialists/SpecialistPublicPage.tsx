import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Empty, List, Rate, Space, Spin, Tag, Typography } from '@/shared/ui';
import { Link, useParams } from 'react-router';

import { fetchSpecialistReviews } from '@/features/reviews/api/reviewsApi';
import { ReviewsList } from '@/features/reviews/ui/ReviewsList';
import { fetchSpecialistById } from '@/features/specialists/api/specialistsApi';

import '@/pages/publicProfile.css';

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
    <main className="public-profile">
      <div className="public-profile__stack">
        <section className="public-profile__hero">
          <div>
            <Typography.Text className="public-profile__kicker">Specialist profile</Typography.Text>
            <Typography.Title level={1} className="public-profile__title">
              {specialist.displayName}
            </Typography.Title>
            {specialist.headline && (
              <Typography.Paragraph className="public-profile__subtitle">{specialist.headline}</Typography.Paragraph>
            )}
            <div className="public-profile__rating">
              <Rate allowHalf disabled value={specialist.rating} style={{ fontSize: 16 }} />
              <span className="public-profile__rating-text">
                {specialist.rating.toFixed(1)} ({specialist.reviewsCount} reviews)
              </span>
            </div>
            {specialist.bio && <Typography.Paragraph className="public-profile__subtitle">{specialist.bio}</Typography.Paragraph>}
            <Descriptions className="public-profile__metadata" column={1}>
              {specialist.category && <Descriptions.Item label="Category">{specialist.category}</Descriptions.Item>}
              {specialist.city && <Descriptions.Item label="City">{specialist.city}</Descriptions.Item>}
            </Descriptions>
          </div>
          <div className="public-profile__hero-actions">
            {specialist.isRemoteSupported && <Tag className="public-profile__tag">Remote available</Tag>}
            {specialist.companies[0]?.services[0] && (
              <Link to={`/services/${specialist.companies[0].services[0].id}/book?specialistId=${specialist.id}`}>
                <Button type="primary">Request appointment</Button>
              </Link>
            )}
          </div>
        </section>

        <section className="public-profile__section">
          <Typography.Title level={3} className="public-profile__section-title">
            Choose where to book
          </Typography.Title>
          {specialist.companies.length === 0 && <Empty description="No active companies yet" />}
          {specialist.companies.length > 0 && (
            <List
              className="public-profile__list"
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
                          <Link key={service.id} to={`/services/${service.id}/book?specialistId=${specialist.id}`}>
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
        </section>

        <section className="public-profile__section">
          <Typography.Title level={3} className="public-profile__section-title">
            Reviews
          </Typography.Title>
          <ReviewsList reviews={reviews ?? []} />
        </section>
      </div>
    </main>
  );
}
