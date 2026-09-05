import { parseJsonOrThrow } from '@/shared/api/apiError';
import { authorizedFetch } from '@/shared/api/authorizedFetch';
import type { PermissionAction } from '@/shared/lib/permissions';

export type DashboardRole = 'client' | 'company' | 'specialist';
export type CompanyMemberRole = 'owner' | 'manager';
export type CompanyStatus = 'draft' | 'published' | 'suspended';
export type SpecialistProfileStatus = 'draft' | 'published' | 'suspended';

export interface DashboardCompany {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: CompanyStatus;
  isRemoteSupported: boolean;
  city: string | null;
  address: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

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
    permissions: PermissionAction[];
  }>;
  specialist: {
    id: string;
    status: SpecialistProfileStatus;
    pendingCompanyRequests: number;
    activeCompanies: number;
    assignedServices: number;
    permissions: PermissionAction[];
  } | null;
  /** Baseline permissions that apply regardless of role (e.g. managing your own appointments). */
  permissions: PermissionAction[];
}

export interface CompanyDashboardSummary {
  company: DashboardCompany;
  role: CompanyMemberRole;
  permissions: PermissionAction[];
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
