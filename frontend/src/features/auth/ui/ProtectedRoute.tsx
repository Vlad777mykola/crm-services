import type { PropsWithChildren } from 'react';
import { Spin } from 'antd';
import { Navigate } from 'react-router';

import { useAuth } from '../model/useAuth';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <Spin style={{ display: 'block', margin: '4rem auto' }} />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
