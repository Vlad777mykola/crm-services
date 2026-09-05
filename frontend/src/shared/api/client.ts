import { getApiUrl } from '@/shared/lib/env';
import { NetworkError, parseJsonOrThrow } from './apiError';

// NOTE(step 7): this hand-written fetch wrapper is a stand-in until Orval generates
// a typed client from contracts/openapi.json into shared/api/generated/. Callers should
// migrate to the generated client as endpoints become available there.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new NetworkError(path, err);
  }

  return parseJsonOrThrow<T>(response);
}
