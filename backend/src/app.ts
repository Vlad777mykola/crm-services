import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';

import { errorHandler } from './common/middleware/errorHandler.js';
import { notFoundHandler } from './common/middleware/notFoundHandler.js';
import { requestLogger } from './common/middleware/requestLogger.js';
import { env } from './env/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
