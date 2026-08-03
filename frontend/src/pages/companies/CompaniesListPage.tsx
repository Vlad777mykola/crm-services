import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Input, List, Pagination, Space, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicCompanies, type PublicCompaniesQuery } from '@/features/companies/api/companiesApi';

const PAGE_SIZE = 10;

export function CompaniesListPage() {
  const [filters, setFilters] = useState<PublicCompaniesQuery>({ page: 1, pageSize: PAGE_SIZE });

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['companies', 'public', filters],
    queryFn: () => fetchPublicCompanies(filters),
    placeholderData: (previous) => previous,
  });

  function updateFilter(patch: Partial<PublicCompaniesQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  return (
    <Card title="Companies" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '1rem' }}>
        <Input.Search
          allowClear
          placeholder="Search companies by name or description"
          onSearch={(value) => updateFilter({ q: value || undefined })}
        />
        <Space wrap>
          <Input
            allowClear
            placeholder="Category"
            style={{ width: 200 }}
            onPressEnter={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
            onBlur={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
          />
          <Input
            allowClear
            placeholder="City"
            style={{ width: 200 }}
            onPressEnter={(e) => updateFilter({ city: e.currentTarget.value || undefined })}
            onBlur={(e) => updateFilter({ city: e.currentTarget.value || undefined })}
          />
        </Space>
      </Space>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load companies"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {data && data.items.length === 0 && <Empty description="No companies match your search" />}
      {data && data.items.length > 0 && (
        <>
          <List
            loading={isFetching}
            dataSource={data.items}
            renderItem={(company) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/companies/${company.id}`}>{company.name}</Link>}
                  description={
                    <>
                      {company.category && <Typography.Text type="secondary">{company.category}</Typography.Text>}
                      {company.city && <Typography.Text type="secondary"> · {company.city}</Typography.Text>}
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
