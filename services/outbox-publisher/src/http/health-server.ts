import http from 'node:http';

import type { OutboxRepository } from '../db/outbox-repository.js';
import { logger } from '../logger.js';
import type { RabbitMqPublisher } from '../rabbitmq/publisher.js';

export function startHealthServer(port: number, repository: OutboxRepository, publisher: RabbitMqPublisher): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/health/ready') {
      repository
        .ping()
        .then(() => {
          if (!publisher.isConnected()) {
            throw new Error('RabbitMQ is not connected');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        })
        .catch((err: unknown) => {
          logger.warn({ err }, '[outbox-publisher] readiness check failed');
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'not-ready' }));
        });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info(`[outbox-publisher] health server listening on :${port} (/health/live, /health/ready)`);
  });

  return server;
}
