import jwt from 'jsonwebtoken';

import { env } from '@/env/env.js';

export interface AccessTokenPayload {
  userId: string;
}

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
