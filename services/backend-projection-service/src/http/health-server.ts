import http from 'node:http';

import type { Pool } from 'pg';

import { logger } from '../logger.js';
import type { RabbitMqConsumer } from '../rabbitmq/consumer.js';

export function startHealthServer(port: number, pool: Pool, consumer: RabbitMqConsumer): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/health/ready') {
      pool
        .query('SELECT 1')
        .then(() => {
          if (!consumer.isConnected()) {
            throw new Error('RabbitMQ is not connected');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        })
        .catch((err: unknown) => {
          logger.warn({ err }, '[backend-projection-service] readiness check failed');
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'not-ready' }));
        });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info(`[backend-projection-service] health server listening on :${port} (/health/live, /health/ready)`);
  });

  return server;
}
