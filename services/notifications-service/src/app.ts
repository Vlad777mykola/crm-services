import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createNotificationsRouter } from './http/routes/notifications.routes.js';
import { logger } from './logger.js';
import type { NotificationsHttpService } from './modules/notifications/notifications.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(
  dataSource: DataSource,
  consumer: RabbitMqConsumer,
  notificationsService: NotificationsHttpService,
): Express {
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

  app.use(createNotificationsRouter(notificationsService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
