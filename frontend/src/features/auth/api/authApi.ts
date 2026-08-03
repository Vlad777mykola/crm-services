import { authorizedFetch } from '@/shared/api/authorizedFetch';
import { getApiUrl } from '@/shared/lib/env';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/auth/schemas.yaml.
export interface AuthUser {
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

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
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

export async function registerRequest(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(`${getApiUrl()}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: AuthSession }>(response);
  return body.data;
}

export async function loginRequest(input: { email: string; password: string }): Promise<AuthSession> {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJsonOrThrow<{ data: AuthSession }>(response);
  return body.data;
}

export async function refreshRequest(): Promise<{ accessToken: string }> {
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const body = await parseJsonOrThrow<{ data: { accessToken: string } }>(response);
  return body.data;
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${getApiUrl()}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await authorizedFetch('/auth/me');
  const body = await parseJsonOrThrow<{ data: AuthUser }>(response);
  return body.data;
}
