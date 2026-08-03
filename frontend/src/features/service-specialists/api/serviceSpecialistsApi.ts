import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/services/schemas.yaml.
export interface ServiceSpecialistSpecialist {
  id: string;
  displayName: string;
}

export interface ServiceSpecialistService {
  id: string;
  name: string;
}

export interface ServiceSpecialist {
  id: string;
  serviceId: string;
  companyId: string;
  specialistProfileId: string;
  specialist?: ServiceSpecialistSpecialist;
  service?: ServiceSpecialistService;
  createdAt: string;
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

export async function assignServiceSpecialist(serviceId: string, specialistProfileId: string): Promise<ServiceSpecialist> {
  const response = await authorizedFetch(`/services/${serviceId}/specialists`, {
    method: 'POST',
    body: JSON.stringify({ specialistProfileId }),
  });
  const body = await parseJsonOrThrow<{ data: ServiceSpecialist }>(response);
  return body.data;
}

export async function fetchServiceSpecialists(serviceId: string): Promise<ServiceSpecialist[]> {
  const response = await authorizedFetch(`/services/${serviceId}/specialists`);
  const body = await parseJsonOrThrow<{ data: ServiceSpecialist[] }>(response);
  return body.data;
}

export async function unassignServiceSpecialist(serviceId: string, specialistProfileId: string): Promise<ServiceSpecialist> {
  const response = await authorizedFetch(`/services/${serviceId}/specialists/${specialistProfileId}`, {
    method: 'DELETE',
  });
  const body = await parseJsonOrThrow<{ data: ServiceSpecialist }>(response);
  return body.data;
}

export async function fetchMySpecialistServices(): Promise<ServiceSpecialist[]> {
  const response = await authorizedFetch('/specialists/me/services');
  const body = await parseJsonOrThrow<{ data: ServiceSpecialist[] }>(response);
  return body.data;
}
