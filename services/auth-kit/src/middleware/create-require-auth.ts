import type { NextFunction, Request, Response } from 'express';

import { AppError } from '@crm/http-kit';

import { verifyAccessToken } from '../jwt/verify-access-token.js';
import type { VerifyAccessTokenOptions } from '../types.js';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

export function createRequireAuth(options: VerifyAccessTokenOptions) {
  return function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = extractBearerToken(req);

    if (!token) {
      next(new AppError('Authentication required', 401));
      return;
    }

    try {
      req.auth = verifyAccessToken(token, options);
      next();
    } catch {
      next(new AppError('Invalid or expired access token', 401));
    }
  };
}
