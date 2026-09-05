import { useQuery } from '@tanstack/react-query';

import { hasAnyPermission, hasPermission, type PermissionAction } from '@/shared/lib/permissions';

import { fetchAppDashboardSummary } from '../api/dashboardApi';

/**
 * Reads the client-persona baseline permissions[] from the same app summary
 * query `useWorkspace` already uses (shared react-query cache key: ['dashboard', 'app']).
 */
export function useAppPermissions(options?: { enabled?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'app'],
    queryFn: fetchAppDashboardSummary,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });

  const permissions = data?.permissions;

  return {
    permissions,
    isLoading,
    can: (action: PermissionAction) => hasPermission(permissions, action),
    canAny: (actions: PermissionAction[]) => hasAnyPermission(permissions, actions),
  };
}
