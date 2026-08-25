import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createAuthRouter } from './http/routes/auth.routes.js';
import { logger } from './logger.js';
import type { AuthService } from './modules/auth/auth.service.js';

export function createApp(
  dataSource: DataSource,
  authService: AuthService,
  consumer?: import('./rabbitmq/consumer.js').RabbitMqConsumer,
): Express {
  const app = express();

  app.use(createRequestIdMiddleware());
  app.use(express.json());
  app.use(cookieParser());
  app.use(createRequestLogger(logger));

  app.use(
    createHealthRouter({
      readiness: async () => {
        await dataSource.query('SELECT 1');
        if (consumer && !consumer.isReady()) {
          throw new Error('RabbitMQ is not connected');
        }
      },
    }),
  );
  app.use(createAuthRouter(authService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
