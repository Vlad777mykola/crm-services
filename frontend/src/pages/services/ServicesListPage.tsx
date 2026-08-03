import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Input, List, Pagination, Space, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicServices, type PublicServicesQuery } from '@/features/services/api/servicesApi';

const PAGE_SIZE = 10;

function formatPrice(price: string | null): string {
  return price ? `$${price}` : 'Price on request';
}

export function ServicesListPage() {
  const [filters, setFilters] = useState<PublicServicesQuery>({ page: 1, pageSize: PAGE_SIZE });

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['services', 'public', filters],
    queryFn: () => fetchPublicServices(filters),
    placeholderData: (previous) => previous,
  });

  function updateFilter(patch: Partial<PublicServicesQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  return (
    <Card title="Services" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '1rem' }}>
        <Input.Search
          allowClear
          placeholder="Search services by name or description"
          onSearch={(value) => updateFilter({ q: value || undefined })}
        />
        <Input
          allowClear
          placeholder="Category"
          style={{ width: 200 }}
          onPressEnter={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
          onBlur={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
        />
      </Space>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load services"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {data && data.items.length === 0 && <Empty description="No services match your search" />}
      {data && data.items.length > 0 && (
        <>
          <List
            loading={isFetching}
            dataSource={data.items}
            renderItem={(service) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/services/${service.id}`}>{service.name}</Link>}
                  description={
                    <>
                      {service.company && (
                        <>
                          <Link to={`/companies/${service.company.id}`}>{service.company.name}</Link> ·{' '}
                        </>
                      )}
                      {service.durationMinutes} min · {formatPrice(service.price)}
                      {service.category && (
                        <Typography.Text type="secondary"> · {service.category}</Typography.Text>
                      )}
                    </>
                  }
                />
              </List.Item>
            )}
          />
          <Pagination
            style={{ marginTop: '1rem', textAlign: 'right' }}
            current={data.meta.page}
            pageSize={data.meta.pageSize}
            total={data.meta.total}
            showSizeChanger={false}
            onChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      )}
    </Card>
  );
}
