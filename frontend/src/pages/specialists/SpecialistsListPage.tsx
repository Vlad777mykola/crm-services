import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircleFilled, EnvironmentOutlined } from '@ant-design/icons';
import { Alert, Avatar, Card, Checkbox, Empty, Input, List, Pagination, Rate, Space, Tag, Spin, Typography } from '@/shared/ui';
import { Link, useNavigate } from 'react-router';

import { fetchPublicSpecialists, type PublicSpecialistsQuery } from '@/features/specialists/api/specialistsApi';
import { PublicBrowseTabs } from '@/widgets/navigation/ui/PublicBrowseTabs';
import '@/pages/publicDirectory.css';

const PAGE_SIZE = 10;

export function SpecialistsListPage() {
  const [filters, setFilters] = useState<PublicSpecialistsQuery>({ page: 1, pageSize: PAGE_SIZE });
  const navigate = useNavigate();

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['specialists', 'public', filters],
    queryFn: () => fetchPublicSpecialists(filters),
    placeholderData: (previous) => previous,
  });

  function updateFilter(patch: Partial<PublicSpecialistsQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function openSpecialist(specialistId: string) {
    navigate(`/specialists/${specialistId}`);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, specialistId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSpecialist(specialistId);
    }
  }

  function stopCardNavigation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <Card title={<PublicBrowseTabs />} className="public-directory-card">
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
            className="public-result-list"
            loading={isFetching}
            dataSource={data.items}
            renderItem={(specialist) => (
              <List.Item
                role="link"
                tabIndex={0}
                aria-label={`View ${specialist.displayName}`}
                onClick={() => openSpecialist(specialist.id)}
                onKeyDown={(event) => handleCardKeyDown(event, specialist.id)}
              >
                <article className="public-result-card">
                  <Avatar size={96} className="public-result-card__avatar">
                    {specialist.displayName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div className="public-result-card__body">
                    <div className="public-result-card__header">
                      <Typography.Title level={3} className="public-result-card__name">
                        {specialist.displayName}
                      </Typography.Title>
                      {specialist.isRemoteSupported && <Tag className="public-result-card__badge">Remote-friendly</Tag>}
                    </div>
                    <div className="public-result-card__meta">
                      <CheckCircleFilled style={{ color: '#00856f' }} />
                      {specialist.headline && <span>{specialist.headline}</span>}
                      {specialist.category && <span>{specialist.category}</span>}
                      {specialist.city && (
                        <span>
                          <EnvironmentOutlined /> {specialist.city}
                        </span>
                      )}
                    </div>
                    {specialist.bio && <div className="public-result-card__description">{specialist.bio}</div>}
                    <div className="public-result-card__rating">
                      <Rate allowHalf disabled value={specialist.rating} style={{ fontSize: 16 }} />
                      <span className="public-result-card__rating-text">
                        {specialist.rating.toFixed(1)} ({specialist.reviewsCount} reviews)
                      </span>
                    </div>
                    <Space size={[4, 4]} wrap className="public-result-card__tags">
                      {specialist.companies.length === 0 && <Typography.Text type="secondary">No active companies yet</Typography.Text>}
                      {specialist.companies.map((company) => (
                        <Link key={company.id} to={`/companies/${company.id}`} onClick={stopCardNavigation}>
                          <Tag>{company.name}</Tag>
                        </Link>
                      ))}
                    </Space>
                  </div>
                </article>
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
