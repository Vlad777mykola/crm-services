import { Router } from 'express';

export interface HealthRouterOptions {
  readiness?: () => Promise<void> | void;
}

export function createHealthRouter(options: HealthRouterOptions = {}): Router {
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

  router.get('/health/ready', async (_req, res) => {
    try {
      await options.readiness?.();
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'not-ready' });
    }
  });

  return router;
}
