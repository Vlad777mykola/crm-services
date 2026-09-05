import { useQuery } from '@tanstack/react-query';

import { hasAnyPermission, hasPermission, type PermissionAction } from '@/shared/lib/permissions';

import { fetchCompanyDashboardSummary } from '../api/dashboardApi';

/**
 * Reads a company's permissions[] from the same dashboard summary query
 * `CompanyDashboardPage` already uses (shared react-query cache key), so
 * pages that only need permission checks (e.g. the appointments page) don't
 * need their own summary fetch just to gate a button.
 */
export function useCompanyPermissions(companyId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'company', companyId],
    queryFn: () => fetchCompanyDashboardSummary(companyId!),
    enabled: Boolean(companyId),
  });

  const permissions = data?.permissions;

  return {
    permissions,
    isLoading,
    role: data?.role,
    can: (action: PermissionAction) => hasPermission(permissions, action),
    canAny: (actions: PermissionAction[]) => hasAnyPermission(permissions, actions),
  };
}
