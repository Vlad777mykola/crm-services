import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createAuthRouter } from './http/routes/auth.routes.js';
import type { AuthService } from './modules/auth/auth.service.js';

export function createApp(pool: Pool, authService: AuthService): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.use(createHealthRouter(pool));
  app.use(createAuthRouter(authService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
