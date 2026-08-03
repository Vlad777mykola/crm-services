import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '@/common/auth/jwt.js';

import { extractBearerToken } from './requireAuth.js';

/**
 * Like `requireAuth`, but never rejects the request. Used by endpoints that
 * are publicly readable but return extra data (or otherwise-hidden records)
 * when the caller happens to be authenticated - e.g. a company owner viewing
 * their own draft company through the same endpoint anonymous visitors use.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const { userId } = verifyAccessToken(token);
    req.auth = { userId };
  } catch {
    // Invalid/expired token on an optional-auth route: treat as anonymous rather than rejecting.
  }

  next();
}
