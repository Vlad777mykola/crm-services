import { createContext } from 'react';

import type { AuthUser } from '@/features/auth/api/authApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  register: (input: { email: string; name: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
