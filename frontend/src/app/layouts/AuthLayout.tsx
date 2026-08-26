import { Outlet } from 'react-router';

import { AppHeader } from '@/app/layouts/AppHeader';

export function AuthLayout() {
  return (
    <>
      <AppHeader />
      <main className="auth-layout__content">
        <Outlet />
      </main>
    </>
  );
}
