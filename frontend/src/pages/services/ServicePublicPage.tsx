import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Spin, Typography } from '@/shared/ui';
import { Link, useParams } from 'react-router';

import { fetchServiceReviews } from '@/features/reviews/api/reviewsApi';
import { ReviewsList } from '@/features/reviews/ui/ReviewsList';
import { fetchServiceById } from '@/features/services/api/servicesApi';

import '@/pages/publicProfile.css';

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function ServicePublicPage() {
  const { serviceId } = useParams<{ serviceId: string }>();

  const { data: service, isLoading, isError, error } = useQuery({
    queryKey: ['service', serviceId, 'public'],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: Boolean(serviceId),
  });

  const { data: reviews } = useQuery({
    queryKey: ['service', serviceId, 'reviews'],
    queryFn: () => fetchServiceReviews(serviceId!),
    enabled: Boolean(serviceId),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !service) {
    return (
      <Alert
        type="error"
        message="Service not found"
        description={error instanceof Error ? error.message : 'This service may not be published yet.'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <main className="public-profile">
      <div className="public-profile__stack">
        <section className="public-profile__hero">
          <div>
            <Typography.Text className="public-profile__kicker">Service</Typography.Text>
            <Typography.Title level={1} className="public-profile__title">
              {service.name}
            </Typography.Title>
            {service.description && (
              <Typography.Paragraph className="public-profile__subtitle">{service.description}</Typography.Paragraph>
            )}
            <Descriptions className="public-profile__metadata" column={1}>
              <Descriptions.Item label="Duration">{service.durationMinutes} min</Descriptions.Item>
              <Descriptions.Item label="Price">{formatPrice(service.price)}</Descriptions.Item>
              {service.category && <Descriptions.Item label="Category">{service.category}</Descriptions.Item>}
              {service.company && (
                <Descriptions.Item label="Company">
                  <Link to={`/companies/${service.company.id}`}>{service.company.name}</Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
          <div className="public-profile__hero-actions">
            <Link to={`/services/${service.id}/book`}>
              <Button type="primary">Request appointment</Button>
            </Link>
          </div>
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
