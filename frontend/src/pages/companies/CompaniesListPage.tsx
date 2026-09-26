import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import { EnvironmentOutlined, GlobalOutlined } from '@ant-design/icons';
import { Alert, Avatar, Card, Empty, Input, List, Pagination, Rate, Space, Spin, Tag, Typography } from '@/shared/ui';
import { useNavigate } from 'react-router';

import { fetchPublicCompanies, type PublicCompaniesQuery } from '@/features/companies/api/companiesApi';
import { PublicBrowseTabs } from '@/widgets/navigation/ui/PublicBrowseTabs';
import '@/pages/publicDirectory.css';

const PAGE_SIZE = 10;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function CompaniesListPage() {
  const [filters, setFilters] = useState<PublicCompaniesQuery>({ page: 1, pageSize: PAGE_SIZE });
  const navigate = useNavigate();

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['companies', 'public', filters],
    queryFn: () => fetchPublicCompanies(filters),
    placeholderData: (previous) => previous,
  });

  function updateFilter(patch: Partial<PublicCompaniesQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  function openCompany(companyId: string) {
    navigate(`/companies/${companyId}`);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, companyId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCompany(companyId);
    }
  }

  return (
    <Card title={<PublicBrowseTabs />} className="public-directory-card">
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
            className="public-result-list"
            loading={isFetching}
            dataSource={data.items}
            renderItem={(company) => (
              <List.Item
                role="link"
                tabIndex={0}
                aria-label={`View ${company.name}`}
                onClick={() => openCompany(company.id)}
                onKeyDown={(event) => handleCardKeyDown(event, company.id)}
              >
                <article className="public-result-card">
                  <Avatar shape="square" size={96} className="public-result-card__avatar">
                    {getInitials(company.name)}
                  </Avatar>
                  <div className="public-result-card__body">
                    <div className="public-result-card__header">
                      <Typography.Title level={3} className="public-result-card__name">
                        {company.name}
                      </Typography.Title>
                      {company.isRemoteSupported && <Tag className="public-result-card__badge">Remote supported</Tag>}
                    </div>
                    <div className="public-result-card__meta">
                      {company.category && <span>{company.category}</span>}
                      {company.city && (
                        <span>
                          <EnvironmentOutlined /> {company.city}
                        </span>
                      )}
                      {company.website && (
                        <span>
                          <GlobalOutlined /> Website available
                        </span>
                      )}
                    </div>
                    {company.description && <div className="public-result-card__description">{company.description}</div>}
                    {company.address && (
                      <div className="public-result-card__meta">
                        <EnvironmentOutlined /> {company.address}
                      </div>
                    )}
                    <div className="public-result-card__rating">
                      <Rate allowHalf disabled value={company.rating} style={{ fontSize: 16 }} />
                      <span className="public-result-card__rating-text">
                        {company.rating.toFixed(1)} ({company.reviewsCount} reviews)
                      </span>
                    </div>
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
