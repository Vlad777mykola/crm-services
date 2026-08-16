import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { errorHandler } from './http/error-handler.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { createNotificationsRouter } from './http/routes/notifications.routes.js';
import { requestLogger } from './http/request-logger.js';
import type { NotificationsHttpService } from './modules/notifications/notifications.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(pool: Pool, consumer: RabbitMqConsumer, notificationsService: NotificationsHttpService): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/health/ready', (_req, res) => {
    pool
      .query('SELECT 1')
      .then(() => {
        if (!consumer.isReady()) {
          throw new Error('RabbitMQ is not connected');
        }
        res.status(200).json({ status: 'ok' });
      })
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  app.use(createNotificationsRouter(notificationsService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
