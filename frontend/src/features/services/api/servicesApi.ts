import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/services/schemas.yaml.
export type ServiceStatus = 'draft' | 'published' | 'suspended';

export interface ServiceCompanySummary {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  price: string | null;
  status: ServiceStatus;
  company?: ServiceCompanySummary;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  category?: string | null;
  durationMinutes: number;
  price?: string | null;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  status?: 'draft' | 'published';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublicServicesQuery {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicServicesResult {
  items: Service[];
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

export async function createService(companyId: string, input: CreateServiceInput): Promise<Service> {
  const response = await authorizedFetch(`/companies/${companyId}/services`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Service }>(response);
  return body.data;
}

export async function fetchCompanyServices(companyId: string): Promise<Service[]> {
  const response = await authorizedFetch(`/companies/${companyId}/services`);
  const body = await parseJsonOrThrow<{ data: Service[] }>(response);
  return body.data;
}

export async function updateService(companyId: string, serviceId: string, input: UpdateServiceInput): Promise<Service> {
  const response = await authorizedFetch(`/companies/${companyId}/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: Service }>(response);
  return body.data;
}

export async function fetchPublicServices(query: PublicServicesQuery = {}): Promise<PublicServicesResult> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  const response = await authorizedFetch(`/services/public${queryString ? `?${queryString}` : ''}`);
  const body = await parseJsonOrThrow<{ data: Service[]; meta: PaginationMeta }>(response);
  return { items: body.data, meta: body.meta };
}

export async function fetchServiceById(serviceId: string): Promise<Service> {
  const response = await authorizedFetch(`/services/${serviceId}`);
  const body = await parseJsonOrThrow<{ data: Service }>(response);
  return body.data;
}
