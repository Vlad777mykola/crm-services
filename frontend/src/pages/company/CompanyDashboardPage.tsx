import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Space, Spin, Tag } from 'antd';
import { Link, useParams } from 'react-router';

import { fetchCompanyById, updateCompany } from '@/features/companies/api/companiesApi';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'green',
  suspended: 'red',
};

export function CompanyDashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId];

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyById(companyId!),
    enabled: Boolean(companyId),
  });

  const publishMutation = useMutation({
    mutationFn: () => updateCompany(companyId!, { status: 'published' }),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !company) {
    return (
      <Alert
        type="error"
        message="Failed to load company"
        description={error instanceof Error ? error.message : 'Unknown error'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <Card
      title={company.name}
      extra={<Tag color={STATUS_COLORS[company.status]}>{company.status}</Tag>}
      style={{ maxWidth: 560, margin: '2rem auto' }}
    >
      {publishMutation.isError && (
        <Alert
          type="error"
          message={publishMutation.error instanceof Error ? publishMutation.error.message : 'Failed to publish company'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Descriptions column={1}>
        <Descriptions.Item label="Slug">{company.slug}</Descriptions.Item>
        <Descriptions.Item label="City">{company.city ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Category">{company.category ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Space style={{ marginTop: 16 }}>
        <Link to={`/company/${company.id}/profile`}>
          <Button>Edit profile</Button>
        </Link>
        {company.status === 'draft' && (
          <Button type="primary" loading={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
            Publish company
          </Button>
        )}
        {company.status === 'published' && (
          <Link to={`/companies/${company.id}`}>
            <Button>View public page</Button>
          </Link>
        )}
      </Space>
    </Card>
  );
}
