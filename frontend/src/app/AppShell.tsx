import { Layout } from 'antd';
import { Outlet } from 'react-router';

import { Header } from '@/shared/ui/header/Header';

import './AppShell.css';

export function AppShell() {
  return (
    <Layout className="app-shell">
      <Header />
      <Layout.Content className="app-shell__content">
        <div className="app-shell__content-inner">
          <Outlet />
        </div>
      </Layout.Content>
    </Layout>
  );
}
