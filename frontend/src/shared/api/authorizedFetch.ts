import { getApiUrl } from '../lib/env';
import { getAccessToken, setAccessToken } from './tokenStore';

// Deduplicates concurrent refresh attempts so a burst of 401s only triggers one
// POST /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    setAccessToken(null);
    return null;
  }

  const body = (await response.json()) as { data: { accessToken: string } };
  setAccessToken(body.data.accessToken);
  return body.data.accessToken;
}

function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function buildHeaders(token: string | null, init?: RequestInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init?.headers,
  };
}

// Fetch wrapper for backend endpoints that require the current user's access token.
// Cookies are always sent (`credentials: 'include'`) so the httpOnly refresh cookie
// reaches the backend when a silent refresh is needed. On a 401, it refreshes the
// access token once and retries the request a single time.
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: buildHeaders(getAccessToken(), init),
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await refreshAccessToken();
  if (!refreshedToken) {
    return response;
  }

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: buildHeaders(refreshedToken, init),
  });
}
