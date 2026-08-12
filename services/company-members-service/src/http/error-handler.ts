import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  const isOperational = err instanceof AppError && err.isOperational;

  if (!isOperational) {
    logger.error({ err, path: req.path }, 'Unhandled error');
  }

  res.status(statusCode).json({ error: { message, statusCode } });
}
