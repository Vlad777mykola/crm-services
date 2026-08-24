import { Router } from 'express';
import type { DataSource } from 'typeorm';

import type { RabbitMqConsumer } from '../rabbitmq/consumer.js';

export function createHealthRouter(dataSource: DataSource, consumer?: RabbitMqConsumer): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    dataSource
      .query('SELECT 1')
      .then(() => {
        if (consumer && !consumer.isReady()) {
          throw new Error('RabbitMQ is not connected');
        }
        res.status(200).json({ status: 'ok' });
      })
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  return router;
}
