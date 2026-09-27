import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircleFilled, EnvironmentOutlined, StarFilled } from '@ant-design/icons';
import { Alert, Avatar, Button, Checkbox, Empty, Input, List, Pagination, Space, Tag, Spin, Typography } from '@/shared/ui';
import { Link, useNavigate } from 'react-router';

import { fetchPublicSpecialists, type PublicSpecialistsQuery } from '@/features/specialists/api/specialistsApi';
import { SpecialistAvailabilityPreview } from '@/pages/specialists/SpecialistAvailabilityPreview';
import { PublicBrowseTabs } from '@/widgets/navigation/ui/PublicBrowseTabs';
import '@/pages/publicDirectory.css';

const PAGE_SIZE = 10;

function renderRating(rating: number, reviewsCount: number) {
  if (reviewsCount === 0) {
    return (
      <>
        <Tag className="public-result-card__new-tag">New</Tag>
        <span className="public-result-card__rating-text">No reviews yet</span>
      </>
    );
  }

  return (
    <>
      <StarFilled className="public-result-card__rating-icon" />
      <span className="public-result-card__rating-score">{rating.toFixed(1)}</span>
      <span className="public-result-card__rating-text">
        {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
      </span>
    </>
  );
}

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

  const resultCount = data?.meta.total ?? 0;

  return (
    <section className="public-directory">
      <div className="public-directory__hero">
        <div>
          <Typography.Title level={1} className="public-directory__title">
            Find a service or specialist
          </Typography.Title>
          <Typography.Paragraph className="public-directory__subtitle">
            Compare trusted professionals by specialty, city, reviews, and live appointment times.
          </Typography.Paragraph>
        </div>
      </div>

      <div className="public-directory__search-panel">
        <Input.Search
          allowClear
          enterButton="Search"
          placeholder="Search service, company, or specialist"
          size="large"
          onSearch={(value) => updateFilter({ q: value || undefined })}
        />
        <Space wrap className="public-directory__filters">
          <Input
            allowClear
            placeholder="Category"
            onPressEnter={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
            onBlur={(e) => updateFilter({ category: e.currentTarget.value || undefined })}
          />
          <Input
            allowClear
            placeholder="City"
            onPressEnter={(e) => updateFilter({ city: e.currentTarget.value || undefined })}
            onBlur={(e) => updateFilter({ city: e.currentTarget.value || undefined })}
          />
          <Checkbox onChange={(e) => updateFilter({ remoteOnly: e.target.checked || undefined })}>
            Remote-friendly only
          </Checkbox>
        </Space>
      </div>

      <div className="public-directory__browse-bar">
        <PublicBrowseTabs />
        <div className="public-directory__result-bar">
          <Typography.Text type="secondary">
            {isLoading ? 'Searching...' : `${resultCount} ${resultCount === 1 ? 'specialist' : 'specialists'}`}
          </Typography.Text>
        </div>
      </div>

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
                <article className="public-result-card public-result-card--specialist">
                  <Avatar size={72} className="public-result-card__avatar">
                    {specialist.displayName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <div className="public-result-card__body">
                    <div className="public-result-card__header">
                      <div className="public-result-card__title-group">
                        <Typography.Title level={3} className="public-result-card__name">
                          {specialist.displayName}
                          <CheckCircleFilled className="public-result-card__verified-icon" aria-label="Verified specialist" />
                        </Typography.Title>
                        <span className="public-result-card__verified-label">Verified specialist</span>
                      </div>
                      <div className="public-result-card__rating">{renderRating(specialist.rating, specialist.reviewsCount)}</div>
                    </div>
                    <div className="public-result-card__meta">
                      {specialist.headline && <span>{specialist.headline}</span>}
                      {specialist.category && <span>{specialist.category}</span>}
                      {specialist.city && (
                        <span>
                          <EnvironmentOutlined /> {specialist.city}
                        </span>
                      )}
                      {specialist.isRemoteSupported && <Tag className="public-result-card__badge">Remote-friendly</Tag>}
                    </div>
                    {specialist.bio && <div className="public-result-card__description">{specialist.bio}</div>}
                    <Space size={[4, 4]} wrap className="public-result-card__tags">
                      {specialist.companies.length === 0 && <Typography.Text type="secondary">No active companies yet</Typography.Text>}
                      {specialist.companies.map((company) => (
                        <Link key={company.id} to={`/companies/${company.id}`} onClick={stopCardNavigation}>
                          <Tag>{company.name}</Tag>
                        </Link>
                      ))}
                    </Space>
                    <div className="public-result-card__actions">
                      <Button type="link" onClick={stopCardNavigation} href={`/specialists/${specialist.id}`}>
                        View profile
                      </Button>
                    </div>
                  </div>
                  <SpecialistAvailabilityPreview
                    specialistProfileId={specialist.id}
                    companies={specialist.companies}
                  />
                </article>
              </List.Item>
            )}
          />
          <Pagination
            className="public-directory__pagination"
            current={data.meta.page}
            pageSize={data.meta.pageSize}
            total={data.meta.total}
            showSizeChanger={false}
            onChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      )}
    </section>
  );
}
