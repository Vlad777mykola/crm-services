import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchAppDashboardSummary } from '@/features/dashboard/api/dashboardApi';
import { PageHeader } from '@/widgets/navigation/ui/PageHeader';

export function SpecialistDashboardPage() {
  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'app'],
    queryFn: fetchAppDashboardSummary,
  });

  if (isLoading) return <Spin style={{ display: 'block', margin: '2rem auto' }} />;

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load specialist dashboard"
        description={error instanceof Error ? error.message : 'Unknown error'}
      />
    );
  }

  const specialist = summary?.specialist;

  return (
    <>
      <PageHeader
        title="Specialist dashboard"
        breadcrumbs={[{ label: 'Specialist', path: '/specialist' }]}
        actions={
          <Link to="/specialist/profile">
            <Button>{specialist ? 'Edit profile' : 'Create profile'}</Button>
          </Link>
        }
      />
      {!specialist ? (
        <Card>
          <Empty description="Create a specialist profile to work with companies">
            <Link to="/specialist/profile">
              <Button type="primary">Create profile</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Space direction="vertical" size="small">
              <Tag>{specialist.status}</Tag>
              <Typography.Text type="secondary">
                Track where you work, which services you provide, and what needs attention.
              </Typography.Text>
            </Space>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} sm={8}>
                <Statistic title="Pending company requests" value={specialist.pendingCompanyRequests} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Active companies" value={specialist.activeCompanies} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Assigned services" value={specialist.assignedServices} />
              </Col>
            </Row>
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title="Companies">
                <Link to="/specialist/companies">
                  <Button block>View companies</Button>
                </Link>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Appointments">
                <Link to="/specialist/appointments">
                  <Button block>Open day view</Button>
                </Link>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title="Availability">
                <Link to="/specialist/availability">
                  <Button block>Review availability</Button>
                </Link>
              </Card>
            </Col>
          </Row>
        </Space>
      )}
    </>
  );
}
