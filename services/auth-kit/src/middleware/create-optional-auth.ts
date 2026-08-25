import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../jwt/verify-access-token.js';
import type { VerifyAccessTokenOptions } from '../types.js';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

export function createOptionalAuth(options: VerifyAccessTokenOptions) {
  return function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = extractBearerToken(req);

    if (!token) {
      next();
      return;
    }

    try {
      req.auth = verifyAccessToken(token, options);
    } catch {
      req.auth = undefined;
    }

    next();
  };
}
