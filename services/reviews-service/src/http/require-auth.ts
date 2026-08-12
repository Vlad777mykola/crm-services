import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../security/jwt.js';

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice('Bearer '.length);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const { userId } = verifyAccessToken(token);
    req.auth = { userId };
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401));
  }
}
