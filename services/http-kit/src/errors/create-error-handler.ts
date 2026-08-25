import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';

import { AppError } from './AppError.js';

function isOperationalHttpError(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  if (!(err instanceof Error)) return false;
  if (err.name !== 'AppError') return false;

  const candidate = err as Error & { statusCode?: unknown; isOperational?: unknown };
  return (
    typeof candidate.statusCode === 'number'
    && candidate.statusCode >= 400
    && candidate.statusCode < 600
    && candidate.isOperational === true
  );
}

export function createErrorHandler(logger: Logger) {
  return function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const isOperational = isOperationalHttpError(err);
    const statusCode = isOperational ? err.statusCode : 500;
    const message = isOperational ? err.message : 'Internal server error';

    if (!isOperational) {
      logger.error({ err, path: req.path, requestId: req.context?.requestId }, 'Unhandled error');
    }

    res.status(statusCode).json({
      error: {
        message,
        statusCode,
        requestId: req.context?.requestId,
      },
    });
  };
}
