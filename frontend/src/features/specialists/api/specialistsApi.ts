import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/specialists/schemas.yaml.
export type SpecialistProfileStatus = 'draft' | 'published' | 'suspended';

export interface SpecialistProfile {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
  status: SpecialistProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecialistProfileInput {
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  category?: string | null;
  city?: string | null;
  isRemoteSupported?: boolean;
}

export interface UpdateSpecialistProfileInput extends Partial<CreateSpecialistProfileInput> {
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

export async function createMySpecialistProfile(input: CreateSpecialistProfileInput): Promise<SpecialistProfile> {
  const response = await authorizedFetch('/specialists/profile', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: SpecialistProfile }>(response);
  return body.data;
}

export async function fetchMySpecialistProfile(): Promise<SpecialistProfile | null> {
  const response = await authorizedFetch('/specialists/me');
  if (response.status === 404) {
    return null;
  }
  const body = await parseJsonOrThrow<{ data: SpecialistProfile }>(response);
  return body.data;
}

export async function updateMySpecialistProfile(input: UpdateSpecialistProfileInput): Promise<SpecialistProfile> {
  const response = await authorizedFetch('/specialists/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: SpecialistProfile }>(response);
  return body.data;
}

export async function fetchPublicSpecialists(): Promise<SpecialistProfile[]> {
  const response = await authorizedFetch('/specialists/public');
  const body = await parseJsonOrThrow<{ data: SpecialistProfile[] }>(response);
  return body.data;
}

export async function fetchSpecialistById(specialistId: string): Promise<SpecialistProfile> {
  const response = await authorizedFetch(`/specialists/${specialistId}`);
  const body = await parseJsonOrThrow<{ data: SpecialistProfile }>(response);
  return body.data;
}
