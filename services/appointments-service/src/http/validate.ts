import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/AppError.js';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodType, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      next(new AppError(`Validation failed: ${message}`, 400));
      return;
    }

    (req as unknown as Record<ValidationTarget, unknown>)[target] = result.data;
    next();
  };
}
