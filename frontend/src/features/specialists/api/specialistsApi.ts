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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublicSpecialistsQuery {
  q?: string;
  category?: string;
  city?: string;
  remoteOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PublicSpecialistsResult {
  items: SpecialistProfile[];
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

export async function fetchPublicSpecialists(query: PublicSpecialistsQuery = {}): Promise<PublicSpecialistsResult> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.city) params.set('city', query.city);
  if (query.remoteOnly) params.set('remoteOnly', 'true');
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  const response = await authorizedFetch(`/specialists/public${queryString ? `?${queryString}` : ''}`);
  const body = await parseJsonOrThrow<{ data: SpecialistProfile[]; meta: PaginationMeta }>(response);
  return { items: body.data, meta: body.meta };
}

export async function fetchSpecialistById(specialistId: string): Promise<SpecialistProfile> {
  const response = await authorizedFetch(`/specialists/${specialistId}`);
  const body = await parseJsonOrThrow<{ data: SpecialistProfile }>(response);
  return body.data;
}
