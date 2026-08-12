import { Router } from 'express';
import type { Pool } from 'pg';

import type { RabbitMqConsumer } from '../rabbitmq/consumer.js';

export function createHealthRouter(pool: Pool, consumer: RabbitMqConsumer): Router {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    pool
      .query('SELECT 1')
      .then(() => {
        if (!consumer.isConnected()) {
          throw new Error('RabbitMQ is not connected');
        }
        res.status(200).json({ status: 'ok' });
      })
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  return router;
}
