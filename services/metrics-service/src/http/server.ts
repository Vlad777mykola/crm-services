import http from 'node:http';

import { logger } from '../logger.js';
import { renderPrometheusMetrics } from '../metrics/store.js';
import type { RabbitMqMetricsStore } from '../metrics/store.js';
import type { RabbitMqConsumer } from '../rabbitmq/consumer.js';

export function startHttpServer(port: number, store: RabbitMqMetricsStore, consumer: RabbitMqConsumer): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      res.end(renderPrometheusMetrics(store.snapshot()));
      return;
    }

    if (req.url === '/health/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/health/ready' || req.url === '/health' || req.url === '/') {
      const ready = consumer.isConnected();
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: ready ? 'ok' : 'not-ready', ...store.snapshot() }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info(`[metrics-service] HTTP server listening on :${port} (/metrics, /health/live, /health/ready)`);
  });

  return server;
}
