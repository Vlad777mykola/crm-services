import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/companies/schemas.yaml.
export type CompanyStatus = 'draft' | 'published' | 'suspended';
export type CompanyMemberRole = 'owner' | 'manager';

export interface Company {
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

export interface CompanyMembership {
  role: CompanyMemberRole;
  company: Company;
}

export interface CreateCompanyInput {
  name: string;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  isRemoteSupported?: boolean;
  city?: string | null;
  address?: string | null;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  status?: 'draft' | 'published';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublicCompaniesQuery {
  q?: string;
  category?: string;
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicCompaniesResult {
  items: Company[];
  meta: PaginationMeta;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | T | undefined;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const response = await authorizedFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Company }>(response);
  return body.data;
}

export async function fetchPublicCompanies(query: PublicCompaniesQuery = {}): Promise<PublicCompaniesResult> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.city) params.set('city', query.city);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  const response = await authorizedFetch(`/companies/public${queryString ? `?${queryString}` : ''}`);
  const body = await parseJsonOrThrow<{ data: Company[]; meta: PaginationMeta }>(response);
  return { items: body.data, meta: body.meta };
}

export async function fetchMyCompanies(): Promise<CompanyMembership[]> {
  const response = await authorizedFetch('/companies/me');
  const body = await parseJsonOrThrow<{ data: CompanyMembership[] }>(response);
  return body.data;
}

export async function fetchCompanyById(companyId: string): Promise<Company> {
  const response = await authorizedFetch(`/companies/${companyId}`);
  const body = await parseJsonOrThrow<{ data: Company }>(response);
  return body.data;
}

export async function updateCompany(companyId: string, input: UpdateCompanyInput): Promise<Company> {
  const response = await authorizedFetch(`/companies/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Company }>(response);
  return body.data;
}
