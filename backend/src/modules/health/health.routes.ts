import { Router } from 'express';

import { AppDataSource } from '@/infrastructure/database/data-source.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/** Process-alive check - never touches the database, so it can't be dragged down by a slow DB. */
healthRouter.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Ready to receive traffic - the database connection is up and reachable. */
healthRouter.get('/health/ready', (_req, res) => {
  if (!AppDataSource.isInitialized) {
    res.status(503).json({ status: 'not-ready', reason: 'database not initialized' });
    return;
  }

  AppDataSource.query('SELECT 1')
    .then(() => {
      res.json({ status: 'ok' });
    })
    .catch((err: unknown) => {
      res.status(503).json({ status: 'not-ready', reason: err instanceof Error ? err.message : 'database unreachable' });
    });
});
