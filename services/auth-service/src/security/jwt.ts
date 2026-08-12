import jwt from 'jsonwebtoken';

import { env } from '../env.js';

export interface AccessTokenPayload {
  userId: string;
}

/**
 * Signs `{ sub: userId }` with `JWT_ACCESS_SECRET`, matching
 * `backend/src/common/auth/jwt.ts` exactly (same claim shape, same secret env
 * var name) so legacy-backend's `requireAuth` keeps accepting tokens issued
 * here for routes not yet extracted - see Phase 2 Task 2.6.
 */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid access token payload');
  }

  return { userId: decoded.sub };
}
