import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/company-specialists/schemas.yaml.
export type CompanySpecialistRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type CompanySpecialistStatus = 'active' | 'paused' | 'removed';

export interface CompanySummary {
  id: string;
  name: string;
}

export interface SpecialistSummary {
  id: string;
  displayName: string;
}

export interface CompanySpecialistRequest {
  id: string;
  companyId: string;
  specialistProfileId: string;
  requestedByUserId: string;
  status: CompanySpecialistRequestStatus;
  message: string | null;
  respondedAt: string | null;
  company?: CompanySummary;
  specialist?: SpecialistSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySpecialist {
  id: string;
  companyId: string;
  specialistProfileId: string;
  status: CompanySpecialistStatus;
  startedAt: string;
  endedAt: string | null;
  company?: CompanySummary;
  specialist?: SpecialistSummary;
  createdAt: string;
  updatedAt: string;
}

export interface SendSpecialistRequestInput {
  specialistProfileId: string;
  message?: string | null;
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

export async function sendSpecialistRequest(
  companyId: string,
  input: SendSpecialistRequestInput,
): Promise<CompanySpecialistRequest> {
  const response = await authorizedFetch(`/companies/${companyId}/specialists/requests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: CompanySpecialistRequest }>(response);
  return body.data;
}

export async function fetchCompanySpecialistRequests(companyId: string): Promise<CompanySpecialistRequest[]> {
  const response = await authorizedFetch(`/companies/${companyId}/specialist-requests`);
  const body = await parseJsonOrThrow<{ data: CompanySpecialistRequest[] }>(response);
  return body.data;
}

export async function fetchCompanySpecialists(companyId: string): Promise<CompanySpecialist[]> {
  const response = await authorizedFetch(`/companies/${companyId}/specialists`);
  const body = await parseJsonOrThrow<{ data: CompanySpecialist[] }>(response);
  return body.data;
}

export async function fetchMySpecialistCompanyRequests(): Promise<CompanySpecialistRequest[]> {
  const response = await authorizedFetch('/specialists/me/company-requests');
  const body = await parseJsonOrThrow<{ data: CompanySpecialistRequest[] }>(response);
  return body.data;
}

export async function fetchMySpecialistCompanies(): Promise<CompanySpecialist[]> {
  const response = await authorizedFetch('/specialists/me/companies');
  const body = await parseJsonOrThrow<{ data: CompanySpecialist[] }>(response);
  return body.data;
}

export async function acceptSpecialistCompanyRequest(requestId: string): Promise<CompanySpecialistRequest> {
  const response = await authorizedFetch(`/specialists/me/company-requests/${requestId}/accept`, {
    method: 'POST',
  });
  const body = await parseJsonOrThrow<{ data: CompanySpecialistRequest }>(response);
  return body.data;
}

export async function rejectSpecialistCompanyRequest(requestId: string): Promise<CompanySpecialistRequest> {
  const response = await authorizedFetch(`/specialists/me/company-requests/${requestId}/reject`, {
    method: 'POST',
  });
  const body = await parseJsonOrThrow<{ data: CompanySpecialistRequest }>(response);
  return body.data;
}
