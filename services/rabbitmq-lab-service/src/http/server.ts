import http from 'node:http';

import { logger } from '../logger.js';
import { handleLive, handleReady } from './routes/health.routes.js';
import {
  handleConfirms,
  handleDirect,
  handleFailure,
  handleFanout,
  handleHeaders,
  handleHello,
  handleIdempotency,
  handleMessages,
  handleOrder,
  handleReset,
  handleRetry,
  handleRpc,
  handleStatus,
  handleTopic,
  handleWork,
  handleWorkCancel,
  handleWorkPeek,
  handleWorkRestart,
} from './routes/lab.routes.js';

type AsyncHandler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;

const POST_ROUTES: Record<string, AsyncHandler> = {
  '/api/lab/hello': handleHello,
  '/api/lab/direct': handleDirect,
  '/api/lab/topic': handleTopic,
  '/api/lab/fanout': handleFanout,
  '/api/lab/headers': handleHeaders,
  '/api/lab/work': handleWork,
  '/api/lab/work/cancel': handleWorkCancel,
  '/api/lab/work/restart': handleWorkRestart,
  '/api/lab/confirms': handleConfirms,
  '/api/lab/failure': handleFailure,
  '/api/lab/retry': handleRetry,
  '/api/lab/rpc': handleRpc,
  '/api/lab/order': handleOrder,
  '/api/lab/idempotency': handleIdempotency,
  '/api/lab/reset': handleReset,
};

const GET_ROUTES: Record<string, AsyncHandler> = {
  '/api/lab/work/peek': handleWorkPeek,
  '/api/lab/messages': handleMessages,
};

function normalizePath(url: string): string {
  const pathOnly = url.split('?')[0] ?? url;
  if (pathOnly.startsWith('/rabbitmq-lab')) {
    const stripped = pathOnly.slice('/rabbitmq-lab'.length);
    return stripped.length > 0 ? stripped : '/';
  }
  return pathOnly;
}

export function startHttpServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    const url = normalizePath(req.url ?? '');
    const method = req.method ?? 'GET';

    if (method === 'GET' && url === '/health/live') {
      handleLive(req, res);
      return;
    }

    if (method === 'GET' && (url === '/health/ready' || url === '/health' || url === '/')) {
      handleReady(req, res);
      return;
    }

    if (method === 'GET' && url === '/api/lab/status') {
      void handleStatus(req, res);
      return;
    }

    if (method === 'GET' && GET_ROUTES[url]) {
      void GET_ROUTES[url](req, res);
      return;
    }

    if (method === 'POST' && POST_ROUTES[url]) {
      void POST_ROUTES[url](req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info(`[rabbitmq-lab-service] HTTP server listening on :${port} (gateway prefix: /rabbitmq-lab)`);
  });

  return server;
}
