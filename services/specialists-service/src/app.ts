import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createSpecialistsRouter } from './http/routes/specialists.routes.js';
import type { SpecialistsService } from './modules/specialists/specialists.service.js';

export function createApp(pool: Pool, specialistsService: SpecialistsService): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createSpecialistsRouter(specialistsService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
