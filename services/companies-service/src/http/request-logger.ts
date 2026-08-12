import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';

import { pinoHttp } from 'pino-http';

import { logger } from '../logger.js';

const REQUEST_ID_HEADER = 'x-request-id';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
});
