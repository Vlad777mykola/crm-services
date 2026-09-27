import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Empty, List, Rate, Space, Spin, Tag, Typography } from '@/shared/ui';
import { Link, useParams } from 'react-router';

import { fetchCompanyById } from '@/features/companies/api/companiesApi';
import { fetchCompanySpecialists } from '@/features/company-specialists/api/companySpecialistsApi';
import { fetchCompanyReviews } from '@/features/reviews/api/reviewsApi';
import { ReviewsList } from '@/features/reviews/ui/ReviewsList';
import { fetchCompanyServices } from '@/features/services/api/servicesApi';

import '@/pages/publicProfile.css';

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function CompanyPublicPage() {
  const { companyId } = useParams<{ companyId: string }>();

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey: ['company', companyId, 'public'],
    queryFn: () => fetchCompanyById(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: services } = useQuery({
    queryKey: ['company', companyId, 'services', 'public'],
    queryFn: () => fetchCompanyServices(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: specialists } = useQuery({
    queryKey: ['company', companyId, 'specialists', 'public'],
    queryFn: () => fetchCompanySpecialists(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: reviews } = useQuery({
    queryKey: ['company', companyId, 'reviews'],
    queryFn: () => fetchCompanyReviews(companyId!),
    enabled: Boolean(companyId),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !company) {
    return (
      <Alert
        type="error"
        message="Company not found"
        description={error instanceof Error ? error.message : 'This company may not be published yet.'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <main className="public-profile public-profile--wide">
      <div className="public-profile__stack">
        <section className="public-profile__hero">
          <div>
            <Typography.Text className="public-profile__kicker">Company profile</Typography.Text>
            <Typography.Title level={1} className="public-profile__title">
              {company.name}
            </Typography.Title>
            {company.description && (
              <Typography.Paragraph className="public-profile__subtitle">{company.description}</Typography.Paragraph>
            )}
            <div className="public-profile__rating">
              <Rate allowHalf disabled value={company.rating} style={{ fontSize: 16 }} />
              <span className="public-profile__rating-text">
                {company.rating.toFixed(1)} ({company.reviewsCount} reviews)
              </span>
            </div>
            <Descriptions className="public-profile__metadata" column={1}>
              {company.category && <Descriptions.Item label="Category">{company.category}</Descriptions.Item>}
              {company.city && <Descriptions.Item label="City">{company.city}</Descriptions.Item>}
              {company.address && <Descriptions.Item label="Address">{company.address}</Descriptions.Item>}
              {company.website && <Descriptions.Item label="Website">{company.website}</Descriptions.Item>}
              {company.phone && <Descriptions.Item label="Phone">{company.phone}</Descriptions.Item>}
              {company.email && <Descriptions.Item label="Email">{company.email}</Descriptions.Item>}
            </Descriptions>
          </div>
          <div className="public-profile__hero-actions">
            {company.isRemoteSupported && <Tag className="public-profile__tag">Remote supported</Tag>}
            {services?.[0] && (
              <Link to={`/services/${services[0].id}/book`}>
                <Button type="primary">Request appointment</Button>
              </Link>
            )}
          </div>
        </section>

        <section className="public-profile__section">
          <Typography.Title level={3} className="public-profile__section-title">
            Services
          </Typography.Title>
          {(!services || services.length === 0) && <Empty description="No published services yet" />}
          {services && services.length > 0 && (
            <List
              className="public-profile__list"
              dataSource={services}
              renderItem={(service) => (
                <List.Item
                  actions={[
                    <Link key="book" to={`/services/${service.id}/book`}>
                      <Button type="primary">Book service</Button>
                    </Link>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Link to={`/services/${service.id}`}>{service.name}</Link>}
                    description={`${service.durationMinutes} min · ${formatPrice(service.price)}`}
                  />
                </List.Item>
              )}
            />
          )}
        </section>

        <section className="public-profile__section">
          <Typography.Title level={3} className="public-profile__section-title">
            Specialists
          </Typography.Title>
          {(!specialists || specialists.length === 0) && <Empty description="No active specialists yet" />}
          {specialists && specialists.length > 0 && (
            <List
              className="public-profile__list"
              dataSource={specialists}
              renderItem={(entry) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      entry.specialist ? (
                        <Link to={`/specialists/${entry.specialist.id}`}>{entry.specialist.displayName}</Link>
                      ) : (
                        'Specialist'
                      )
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">
                          Active since {new Date(entry.startedAt).toLocaleDateString()}
                        </Typography.Text>
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
