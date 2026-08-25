import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createUsersRouter } from './http/routes/users.routes.js';
import { logger } from './logger.js';
import type { UsersService } from './modules/users/users.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(dataSource: DataSource, consumer: RabbitMqConsumer, usersService: UsersService): Express {
  const app = express();

  app.use(createRequestIdMiddleware());
  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.use(
    createHealthRouter({
      readiness: async () => {
        await dataSource.query('SELECT 1');
        if (!consumer.isReady()) {
          throw new Error('RabbitMQ is not connected');
        }
      },
    }),
  );
  app.use(createUsersRouter(usersService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
