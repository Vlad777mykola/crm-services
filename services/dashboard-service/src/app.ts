import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { env } from './env.js';
import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createDashboardRouter } from './http/routes/dashboard.routes.js';
import type { DashboardService } from './modules/dashboard/dashboard.service.js';

export function createApp(pool: Pool, dashboardService: DashboardService): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createDashboardRouter(dashboardService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
