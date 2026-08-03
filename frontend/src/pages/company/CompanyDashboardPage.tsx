import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Descriptions, Row, Space, Spin, Statistic, Tag } from 'antd';
import { Link, useParams } from 'react-router';

import { updateCompany } from '@/features/companies/api/companiesApi';
import { fetchCompanyDashboardSummary } from '@/features/dashboard/api/dashboardApi';

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  published: 'green',
  suspended: 'red',
};

export function CompanyDashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['dashboard', 'company', companyId];

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyDashboardSummary(companyId!),
    enabled: Boolean(companyId),
  });

  const publishMutation = useMutation({
    mutationFn: () => updateCompany(companyId!, { status: 'published' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !summary) {
    return (
      <Alert
        type="error"
        message="Failed to load company"
        description={error instanceof Error ? error.message : 'Unknown error'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  const { company } = summary;

  return (
    <Card
      title={company.name}
      extra={<Tag color={STATUS_COLORS[company.status]}>{company.status}</Tag>}
      style={{ maxWidth: 800, margin: '2rem auto' }}
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
        <Descriptions.Item label="Your role">{summary.role}</Descriptions.Item>
        <Descriptions.Item label="Slug">{company.slug}</Descriptions.Item>
        <Descriptions.Item label="City">{company.city ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Category">{company.category ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} md={6}><Statistic title="Pending appointments" value={summary.pendingAppointments} /></Col>
        <Col xs={12} md={6}><Statistic title="Active specialists" value={summary.activeSpecialists} /></Col>
        <Col xs={12} md={6}><Statistic title="Active members" value={summary.activeMembers} /></Col>
        <Col xs={12} md={6}><Statistic title="Services" value={summary.services.total} /></Col>
        <Col xs={12} md={6}><Statistic title="Published services" value={summary.services.published} /></Col>
        <Col xs={12} md={6}><Statistic title="Draft services" value={summary.services.draft} /></Col>
        <Col xs={12} md={6}><Statistic title="Pending specialist requests" value={summary.pendingSpecialistRequests} /></Col>
      </Row>
      <Space wrap style={{ marginTop: 24 }}>
        <Link to={`/company/${company.id}/profile`}>
          <Button>Edit profile</Button>
        </Link>
        <Link to={`/company/${company.id}/members`}>
          <Button>Manage members</Button>
        </Link>
        <Link to={`/company/${company.id}/specialists`}>
          <Button>Specialists</Button>
        </Link>
        <Link to={`/company/${company.id}/specialist-requests`}>
          <Button>Specialist requests</Button>
        </Link>
        <Link to={`/company/${company.id}/services`}>
          <Button>Services</Button>
        </Link>
        <Link to={`/company/${company.id}/appointments`}>
          <Button>Appointments</Button>
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
