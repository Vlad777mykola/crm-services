import type { Company, CompanyMemberRole, CompanyStatus } from '@/features/companies/api/companiesApi';
import type { SpecialistProfileStatus } from '@/features/specialists/api/specialistsApi';
import { authorizedFetch } from '@/shared/api/authorizedFetch';

export type DashboardRole = 'client' | 'company' | 'specialist';

export interface AppDashboardSummary {
  roles: DashboardRole[];
  unreadNotifications: number;
  appointments: {
    pending: number;
    approved: number;
    completed: number;
  };
  companies: Array<{
    id: string;
    name: string;
    status: CompanyStatus;
    role: CompanyMemberRole;
  }>;
  specialist: {
    id: string;
    status: SpecialistProfileStatus;
    pendingCompanyRequests: number;
    activeCompanies: number;
    assignedServices: number;
  } | null;
}

export interface CompanyDashboardSummary {
  company: Company;
  role: CompanyMemberRole;
  pendingAppointments: number;
  activeSpecialists: number;
  pendingSpecialistRequests: number;
  activeMembers: number;
  services: {
    total: number;
    draft: number;
    published: number;
  };
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | T | undefined;

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

export async function fetchAppDashboardSummary(): Promise<AppDashboardSummary> {
  const response = await authorizedFetch('/app/summary');
  const body = await parseJsonOrThrow<{ data: AppDashboardSummary }>(response);
  return body.data;
}

export async function fetchCompanyDashboardSummary(companyId: string): Promise<CompanyDashboardSummary> {
  const response = await authorizedFetch(`/companies/${companyId}/summary`);
  const body = await parseJsonOrThrow<{ data: CompanyDashboardSummary }>(response);
  return body.data;
}
