import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { env } from './env.js';
import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createServiceSpecialistsRouter } from './http/routes/service-specialists.routes.js';
import { createServicesRouter } from './http/routes/services.routes.js';
import type { ServiceSpecialistsService } from './modules/services/service-specialists.service.js';
import type { ServicesService } from './modules/services/services.service.js';

export function createApp(
  pool: Pool,
  servicesService: ServicesService,
  serviceSpecialistsService: ServiceSpecialistsService,
): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createServicesRouter(servicesService));
  app.use(createServiceSpecialistsRouter(serviceSpecialistsService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
