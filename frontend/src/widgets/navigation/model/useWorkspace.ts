import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { matchPath, useLocation, useParams } from 'react-router';

import { useAuth } from '@/features/auth/model/useAuth';
import { fetchAppDashboardSummary } from '@/features/dashboard/api/dashboardApi';
import type { WorkspaceKind, WorkspaceOption } from '@/widgets/navigation/model/types';

export function useWorkspace() {
  const location = useLocation();
  const params = useParams<{ companyId?: string }>();
  const { status } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'app'],
    queryFn: fetchAppDashboardSummary,
    enabled: status === 'authenticated',
    staleTime: 30_000,
    retry: false,
  });

  const kind = useMemo<WorkspaceKind>(() => {
    if (matchPath('/company/:companyId/*', location.pathname)) return 'company';
    if (matchPath('/specialist/*', location.pathname)) return 'specialist';
    if (
      matchPath('/app/*', location.pathname) ||
      matchPath('/services/:serviceId/book', location.pathname) ||
      location.pathname === '/company/create'
    ) {
      return 'client';
    }
    return 'public';
  }, [location.pathname]);

  const workspaceOptions = useMemo<WorkspaceOption[]>(() => {
    const summary = summaryQuery.data;
    const options: WorkspaceOption[] = [{ key: 'client', label: 'Client workspace', path: '/app', kind: 'client' }];

    options.push({
      key: 'specialist',
      label: summary?.specialist ? 'Specialist workspace' : 'Create specialist profile',
      path: summary?.specialist ? '/specialist' : '/specialist/profile',
      kind: 'specialist',
    });

    for (const company of summary?.companies ?? []) {
      options.push({
        key: `company:${company.id}`,
        label: company.name,
        path: `/company/${company.id}/dashboard`,
        kind: 'company',
      });
    }

    options.push({ key: 'create-company', label: 'Create company', path: '/company/create', kind: 'company' });
    return options;
  }, [summaryQuery.data]);

  const currentOptionKey =
    kind === 'company' && params.companyId
      ? `company:${params.companyId}`
      : kind === 'specialist'
        ? 'specialist'
        : 'client';

  return {
    kind,
    companyId: params.companyId,
    currentOptionKey,
    workspaceOptions,
    summary: summaryQuery.data,
    isLoadingSummary: summaryQuery.isLoading,
    isSummaryError: summaryQuery.isError,
  };
}
