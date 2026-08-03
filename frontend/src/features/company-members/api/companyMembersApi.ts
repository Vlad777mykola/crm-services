import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/company-members/schemas.yaml.
export type CompanyMemberRole = 'owner' | 'manager';
export type CompanyMemberStatus = 'active' | 'removed';

export interface CompanyMember {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
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

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const response = await authorizedFetch(`/companies/${companyId}/members`);
  const body = await parseJsonOrThrow<{ data: CompanyMember[] }>(response);
  return body.data;
}

export async function inviteCompanyMember(companyId: string, email: string): Promise<CompanyMember> {
  const response = await authorizedFetch(`/companies/${companyId}/members/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const body = await parseJsonOrThrow<{ data: CompanyMember }>(response);
  return body.data;
}

export async function updateCompanyMemberStatus(
  companyId: string,
  memberId: string,
  status: CompanyMemberStatus,
): Promise<CompanyMember> {
  const response = await authorizedFetch(`/companies/${companyId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const body = await parseJsonOrThrow<{ data: CompanyMember }>(response);
  return body.data;
}

export async function removeCompanyMember(companyId: string, memberId: string): Promise<CompanyMember> {
  const response = await authorizedFetch(`/companies/${companyId}/members/${memberId}`, {
    method: 'DELETE',
  });
  const body = await parseJsonOrThrow<{ data: CompanyMember }>(response);
  return body.data;
}
