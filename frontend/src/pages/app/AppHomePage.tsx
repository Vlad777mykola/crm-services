import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Descriptions, Empty, List, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/model/useAuth';
import { fetchAppDashboardSummary } from '@/features/dashboard/api/dashboardApi';

export function AppHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'app'],
    queryFn: fetchAppDashboardSummary,
    refetchInterval: 30_000,
  });

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Space direction="vertical" style={{ display: 'flex', maxWidth: 900, margin: '2rem auto' }} size="large">
      <Card title="My account">
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Welcome, {user?.name}
        </Typography.Title>
        <Descriptions column={1}>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Status">{user?.status}</Descriptions.Item>
          <Descriptions.Item label="Roles">
            <Space>{summary?.roles.map((role) => <Tag key={role}>{role}</Tag>)}</Space>
          </Descriptions.Item>
        </Descriptions>
        <Space wrap style={{ marginTop: 16 }}>
          <Link to="/app/profile">
            <Button>Edit profile</Button>
          </Link>
          <Link to="/app/appointments">
            <Button>My appointments</Button>
          </Link>
          <Link to="/app/notifications">
            <Badge count={summary?.unreadNotifications ?? 0} size="small" offset={[-4, 4]}>
              <Button>Notifications</Button>
            </Badge>
          </Link>
          <Button danger onClick={onLogout}>
            Log out
          </Button>
        </Space>
      </Card>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load dashboard"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}

      {summary && (
        <Card title="Client activity">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}><Statistic title="Pending requests" value={summary.appointments.pending} /></Col>
            <Col xs={24} sm={8}><Statistic title="Approved" value={summary.appointments.approved} /></Col>
            <Col xs={24} sm={8}><Statistic title="Completed" value={summary.appointments.completed} /></Col>
          </Row>
        </Card>
      )}

      {summary && (
        <Card
          title="Specialist dashboard"
          extra={<Link to="/specialist/profile"><Button size="small">{summary.specialist ? 'Edit profile' : 'Create profile'}</Button></Link>}
        >
          {!summary.specialist ? (
            <Empty description="Create a specialist profile to work with companies" />
          ) : (
            <>
              <Tag>{summary.specialist.status}</Tag>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={8}><Statistic title="Pending company requests" value={summary.specialist.pendingCompanyRequests} /></Col>
                <Col xs={24} sm={8}><Statistic title="Active companies" value={summary.specialist.activeCompanies} /></Col>
                <Col xs={24} sm={8}><Statistic title="Assigned services" value={summary.specialist.assignedServices} /></Col>
              </Row>
              <Space wrap style={{ marginTop: 16 }}>
                <Link to="/specialist/company-requests"><Button>Company requests</Button></Link>
                <Link to="/specialist/companies"><Button>My companies</Button></Link>
                <Link to="/specialist/services"><Button>My services</Button></Link>
              </Space>
            </>
          )}
        </Card>
      )}

      <Card
        title="My companies"
        extra={
          <Link to="/company/create">
            <Button type="primary" size="small">
              Create company
            </Button>
          </Link>
        }
      >
        {summary && summary.companies.length === 0 && <Empty description="You don't manage any companies yet" />}
        {summary && summary.companies.length > 0 && (
          <List
            dataSource={summary.companies}
            renderItem={(company) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/company/${company.id}/dashboard`}>{company.name}</Link>}
                  description={`${company.role} · ${company.status}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
