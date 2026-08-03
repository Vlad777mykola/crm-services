import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '@/common/errors/AppError.js';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodType, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      next(new AppError(`Validation failed: ${message}`, 400));
      return;
    }

    if (target === 'query') {
      // Express 5 exposes `req.query` as a getter-only property, so it can't be
      // reassigned - stash the parsed/coerced value separately instead.
      req.validatedQuery = result.data;
    } else {
      (req as unknown as Record<Exclude<ValidationTarget, 'query'>, unknown>)[target] = result.data;
    }
    next();
  };
}
