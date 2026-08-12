import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';

import { pinoHttp } from 'pino-http';

import { logger } from '../logger.js';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Reuses the request id set by the gateway (docs/architecture/url-convention.md,
 * Phase 1 Task 1.3) so a single id ties gateway access logs to this service's
 * logs for the same request. Falls back to a fresh uuid when called directly
 * (local dev without the gateway in front, health checks, etc.).
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
});
