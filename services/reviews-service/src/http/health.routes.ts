import { Router } from 'express';
import type { Pool } from 'pg';

export function createHealthRouter(pool: Pool): Router {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    pool
      .query('SELECT 1')
      .then(() => res.status(200).json({ status: 'ok' }))
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  return router;
}
