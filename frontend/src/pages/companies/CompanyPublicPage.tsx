import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Empty, List, Space, Spin, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router';

import { fetchCompanyById } from '@/features/companies/api/companiesApi';
import { fetchCompanyServices } from '@/features/services/api/servicesApi';

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
    <Space direction="vertical" style={{ display: 'flex', maxWidth: 560, margin: '2rem auto' }} size="large">
      <Card
        title={company.name}
        extra={company.isRemoteSupported ? <Tag color="blue">Remote supported</Tag> : null}
      >
        {company.description && <Typography.Paragraph>{company.description}</Typography.Paragraph>}
        <Descriptions column={1}>
          {company.category && <Descriptions.Item label="Category">{company.category}</Descriptions.Item>}
          {company.city && <Descriptions.Item label="City">{company.city}</Descriptions.Item>}
          {company.address && <Descriptions.Item label="Address">{company.address}</Descriptions.Item>}
          {company.website && <Descriptions.Item label="Website">{company.website}</Descriptions.Item>}
          {company.phone && <Descriptions.Item label="Phone">{company.phone}</Descriptions.Item>}
          {company.email && <Descriptions.Item label="Email">{company.email}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card title="Services">
        {(!services || services.length === 0) && <Empty description="No published services yet" />}
        {services && services.length > 0 && (
          <List
            dataSource={services}
            renderItem={(service) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/services/${service.id}`}>{service.name}</Link>}
                  description={`${service.durationMinutes} min · ${formatPrice(service.price)}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
