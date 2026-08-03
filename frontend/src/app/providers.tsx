import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';

import { AuthProvider } from '@/features/auth/model/AuthContext';

const queryClient = new QueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
