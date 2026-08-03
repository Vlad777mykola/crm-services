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

export async function fetchPublicServices(): Promise<Service[]> {
  const response = await authorizedFetch('/services/public');
  const body = await parseJsonOrThrow<{ data: Service[] }>(response);
  return body.data;
}

export async function fetchServiceById(serviceId: string): Promise<Service> {
  const response = await authorizedFetch(`/services/${serviceId}`);
  const body = await parseJsonOrThrow<{ data: Service }>(response);
  return body.data;
}
