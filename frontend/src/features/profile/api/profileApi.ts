import type { AuthUser } from '@/features/auth/api/authApi';
import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/users/schemas.yaml.
export type UserProfile = AuthUser;

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
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

export async function fetchMyProfile(): Promise<UserProfile> {
  const response = await authorizedFetch('/users/me');
  const body = await parseJsonOrThrow<{ data: UserProfile }>(response);
  return body.data;
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const response = await authorizedFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: UserProfile }>(response);
  return body.data;
}
