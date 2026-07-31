import cors from 'cors';
import express, { type Express } from 'express';

import { errorHandler } from './common/middleware/errorHandler.js';
import { notFoundHandler } from './common/middleware/notFoundHandler.js';
import { requestLogger } from './common/middleware/requestLogger.js';
import { env } from './env/env.js';
import { healthRouter } from './modules/health/health.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json());
  app.use(requestLogger);

  app.use(healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
