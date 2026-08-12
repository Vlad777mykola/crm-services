import jwt from 'jsonwebtoken';

import { env } from '../env.js';

export interface AccessTokenPayload {
  userId: string;
}

/**
 * Verify-only - this service never issues tokens, only auth-service does
 * (services/auth-service/src/security/jwt.ts). Must use the same
 * JWT_ACCESS_SECRET and `{ sub: userId }` payload shape.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid access token payload');
  }

  return { userId: decoded.sub };
}
