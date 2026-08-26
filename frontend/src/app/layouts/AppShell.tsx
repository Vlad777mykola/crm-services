import { Layout } from 'antd';
import { Outlet } from 'react-router';

import './layouts.css';

export function AppShell() {
  return (
    <Layout className="app-shell">
      <Outlet />
    </Layout>
  );
}
