import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Empty, List, Space, Spin, Typography } from 'antd';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/model/useAuth';
import { fetchMyCompanies } from '@/features/companies/api/companiesApi';

export function AppHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    data: memberships,
    isLoading: isLoadingCompanies,
    isError: isCompaniesError,
  } = useQuery({
    queryKey: ['companies', 'me'],
    queryFn: fetchMyCompanies,
  });

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Space direction="vertical" style={{ display: 'flex', maxWidth: 480, margin: '2rem auto' }} size="large">
      <Card title="My account">
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Welcome, {user?.name}
        </Typography.Title>
        <Descriptions column={1}>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Status">{user?.status}</Descriptions.Item>
        </Descriptions>
        <Space style={{ marginTop: 16 }}>
          <Link to="/app/profile">
            <Button>Edit profile</Button>
          </Link>
          <Link to="/specialist/profile">
            <Button>Specialist profile</Button>
          </Link>
          <Link to="/specialist/company-requests">
            <Button>Company requests</Button>
          </Link>
          <Button danger onClick={onLogout}>
            Log out
          </Button>
        </Space>
      </Card>

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
        {isLoadingCompanies && <Spin style={{ display: 'block', margin: '1rem auto' }} />}
        {isCompaniesError && <Typography.Text type="danger">Failed to load your companies</Typography.Text>}
        {memberships && memberships.length === 0 && <Empty description="You don't manage any companies yet" />}
        {memberships && memberships.length > 0 && (
          <List
            dataSource={memberships}
            renderItem={({ company, role }) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={`/company/${company.id}/dashboard`}>{company.name}</Link>}
                  description={`${role} · ${company.status}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}
