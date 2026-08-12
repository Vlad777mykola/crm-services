import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { env } from './env.js';
import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createCompaniesRouter } from './http/routes/companies.routes.js';
import type { CompaniesService } from './modules/companies/companies.service.js';

export function createApp(pool: Pool, companiesService: CompaniesService): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createCompaniesRouter(companiesService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
