import jwt from 'jsonwebtoken';

import type { AuthContext, VerifyAccessTokenOptions } from '../types.js';

export function verifyAccessToken(token: string, options: VerifyAccessTokenOptions): AuthContext {
  const decoded = jwt.verify(token, options.jwtSecret, {
    issuer: options.issuer,
    audience: options.audience,
  });

  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid access token payload');
  }

  return { userId: decoded.sub };
}
