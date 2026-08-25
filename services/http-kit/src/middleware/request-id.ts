import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const RESPONSE_REQUEST_ID_HEADER = 'X-Request-Id';

function getIncomingRequestId(req: Request): string | undefined {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return Array.isArray(incoming) ? incoming[0] : incoming;
}

export function createRequestIdMiddleware() {
  return function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = getIncomingRequestId(req) ?? randomUUID();

    req.context = {
      ...req.context,
      requestId,
    };
    res.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
    next();
  };
}
