import { Router } from 'express';
import type { DataSource } from 'typeorm';

export function createHealthRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    dataSource
      .query('SELECT 1')
      .then(() => res.status(200).json({ status: 'ok' }))
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  return router;
}
