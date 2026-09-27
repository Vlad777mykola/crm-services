import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircleFilled, EnvironmentOutlined, StarFilled } from '@ant-design/icons';
import {
	Alert,
	Avatar,
	Button,
	Empty,
	Input,
	List,
	Pagination,
	Space,
	Spin,
	Tag,
	Typography,
} from '@/shared/ui';
import { useNavigate } from 'react-router';

import {
	fetchPublicCompanies,
	type PublicCompaniesQuery,
} from '@/features/companies/api/companiesApi';
import { CompanyAvailabilityPreview } from '@/pages/companies/CompanyAvailabilityPreview';
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
						Search companies by service, category, or city.
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
				</Space>
			</div>

			<div className="public-directory__browse-bar">
				<PublicBrowseTabs />
				<div className="public-directory__result-bar">
					<Typography.Text type="secondary">
						{isLoading
							? 'Searching...'
							: `${resultCount} ${resultCount === 1 ? 'company' : 'companies'}`}
					</Typography.Text>
				</div>
			</div>

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
								<article className="public-result-card public-result-card--company">
									<Avatar shape="square" size={72} className="public-result-card__avatar">
										{getInitials(company.name)}
									</Avatar>
									<div className="public-result-card__body">
										<div className="public-result-card__header">
											<div className="public-result-card__title-group">
												<Typography.Title level={3} className="public-result-card__name">
													{company.name}
													<CheckCircleFilled
														className="public-result-card__verified-icon"
														aria-label="Verified business"
													/>
												</Typography.Title>
												<span className="public-result-card__verified-label">
													Verified business
												</span>
											</div>
											<div className="public-result-card__rating">
												{renderRating(company.rating, company.reviewsCount)}
											</div>
										</div>
										<div className="public-result-card__meta">
											{company.category && <span>{company.category}</span>}
											{company.city && (
												<span>
													<EnvironmentOutlined /> {company.city}
												</span>
											)}
											{company.isRemoteSupported && (
												<Tag className="public-result-card__badge">Remote supported</Tag>
											)}
										</div>
										{company.description && (
											<div className="public-result-card__description">{company.description}</div>
										)}
										{company.address && (
											<div className="public-result-card__address">
												<EnvironmentOutlined /> {company.address}
											</div>
										)}
										<div className="public-result-card__actions">
											<Button
												type="link"
												onClick={stopCardNavigation}
												href={`/companies/${company.id}`}
											>
												View profile
											</Button>
											{company.website && (
												<Button type="link" onClick={stopCardNavigation} href={company.website}>
													Website
												</Button>
											)}
										</div>
									</div>
									<CompanyAvailabilityPreview companyId={company.id} />
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
