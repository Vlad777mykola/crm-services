import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  refreshRequest,
  registerRequest,
  type AuthUser,
} from '@/features/auth/api/authApi';
import { setAccessToken } from '@/shared/api/tokenStore';

import { AuthContext, type AuthStatus } from './authContextInstance';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // On first load there's no in-memory access token yet - attempt a silent refresh
  // using the httpOnly cookie so a returning user doesn't have to log in again.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refreshRequest();
        const currentUser = await fetchCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setStatus('unauthenticated');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (input: { email: string; name: string; password: string }) => {
    const session = await registerRequest(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const session = await loginRequest(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({ user, status, register, login, logout }),
    [user, status, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
