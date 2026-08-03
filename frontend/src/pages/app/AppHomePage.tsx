import { Button, Card, Descriptions, Typography } from 'antd';
import { useNavigate } from 'react-router';

import { useAuth } from '../../features/auth/model/useAuth';

export function AppHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Card title="My account" style={{ maxWidth: 480, margin: '2rem auto' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Welcome, {user?.name}
      </Typography.Title>
      <Descriptions column={1}>
        <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
        <Descriptions.Item label="Status">{user?.status}</Descriptions.Item>
      </Descriptions>
      <Button danger onClick={onLogout} style={{ marginTop: 16 }}>
        Log out
      </Button>
    </Card>
  );
}
