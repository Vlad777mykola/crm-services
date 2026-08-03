import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Checkbox, Empty, Input, List, Pagination, Space, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicSpecialists, type PublicSpecialistsQuery } from '@/features/specialists/api/specialistsApi';

const PAGE_SIZE = 10;

export function SpecialistsListPage() {
  const [filters, setFilters] = useState<PublicSpecialistsQuery>({ page: 1, pageSize: PAGE_SIZE });

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['specialists', 'public', filters],
    queryFn: () => fetchPublicSpecialists(filters),
    placeholderData: (previous) => previous,
  });

  function updateFilter(patch: Partial<PublicSpecialistsQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  return (
    <Card title="Specialists" style={{ maxWidth: 720, margin: '2rem auto' }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: '1rem' }}>
        <Input.Search
          allowClear
          placeholder="Search specialists by name, headline, or bio"
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
          <Checkbox onChange={(e) => updateFilter({ remoteOnly: e.target.checked || undefined })}>
            Remote-friendly only
          </Checkbox>
        </Space>
      </Space>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load specialists"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {data && data.items.length === 0 && <Empty description="No specialists match your search" />}
      {data && data.items.length > 0 && (
        <>
          <List
            loading={isFetching}
            dataSource={data.items}
            renderItem={(specialist) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/specialists/${specialist.id}`}>{specialist.displayName}</Link>}
                  description={
                    <>
                      {specialist.headline && <Typography.Text type="secondary">{specialist.headline}</Typography.Text>}
                      {specialist.category && <Typography.Text type="secondary"> · {specialist.category}</Typography.Text>}
                      {specialist.city && <Typography.Text type="secondary"> · {specialist.city}</Typography.Text>}
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
