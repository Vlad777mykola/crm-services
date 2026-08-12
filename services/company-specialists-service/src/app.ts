import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createCompanySpecialistsRouter } from './http/routes/company-specialists.routes.js';
import type { CompanySpecialistsService } from './modules/company-specialists/company-specialists.service.js';

export function createApp(pool: Pool, service: CompanySpecialistsService): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createCompanySpecialistsRouter(service));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
