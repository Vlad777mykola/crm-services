import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const REQUEST_ID_HEADER = 'x-request-id';
const RESPONSE_REQUEST_ID_HEADER = 'X-Request-Id';

function getRequestContextId(req: IncomingMessage): string | undefined {
  return (req as Request).context?.requestId;
}

function getIncomingRequestId(req: IncomingMessage): string | undefined {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return Array.isArray(incoming) ? incoming[0] : incoming;
}

export function createRequestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const requestId = getRequestContextId(req) ?? getIncomingRequestId(req) ?? randomUUID();
      res.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
      return requestId;
    },
    customProps: (req: IncomingMessage) => ({
      requestId: getRequestContextId(req),
    }),
  });
}
