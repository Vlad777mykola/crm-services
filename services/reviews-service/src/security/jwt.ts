import jwt from 'jsonwebtoken';

import { env } from '../env.js';

export interface AccessTokenPayload {
  userId: string;
}

/** Verify-only - only auth-service issues tokens. Must use the same secret/payload shape. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid access token payload');
  }

  return { userId: decoded.sub };
}
