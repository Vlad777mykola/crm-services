import { parseJsonOrThrow } from '@/shared/api/apiError';
import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/users/schemas.yaml.
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  const response = await authorizedFetch('/users/me');
  if (response.status === 404) {
    return null;
  }
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
