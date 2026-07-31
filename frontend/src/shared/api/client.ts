import { getApiUrl } from '../lib/env';

// NOTE(step 7): this hand-written fetch wrapper is a stand-in until Orval generates
// a typed client from contracts/openapi.json into shared/api/generated/. Callers should
// migrate to the generated client as endpoints become available there.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
