// Access token lives in memory only (never localStorage) so it disappears on full page
// reload; the httpOnly refresh-token cookie is what allows silently restoring a session.
let currentAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

// authorizedFetch lives outside React and can't call useAuth() directly. When its
// background refresh-on-401 fails, it calls this so AuthContext can flip to
// 'unauthenticated' instead of leaving the UI stuck showing a stale logged-in state
// while every API call keeps failing with 401.
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired(): void {
  sessionExpiredHandler?.();
}
