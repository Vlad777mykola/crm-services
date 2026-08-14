import type { IncomingMessage, ServerResponse } from 'node:http';

import { isServiceReady } from '../../health/state.js';

/** Process alive - never depends on RabbitMQ. */
export function handleLive(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}

/** Ready to teach - false while RabbitMQ or Postgres is unreachable. */
export function handleReady(_req: IncomingMessage, res: ServerResponse): void {
  const ready = isServiceReady();
  res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: ready ? 'ok' : 'not-ready' }));
}
