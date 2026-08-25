import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createCompanySpecialistsRouter } from './http/routes/company-specialists.routes.js';
import { logger } from './logger.js';
import type { CompanySpecialistsService } from './modules/company-specialists/company-specialists.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(dataSource: DataSource, consumer: RabbitMqConsumer, service: CompanySpecialistsService): Express {
  const app = express();

  app.use(createRequestIdMiddleware());
  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.use(
    createHealthRouter({
      readiness: async () => {
        await dataSource.query('SELECT 1');
        if (!consumer.isReady()) {
          throw new Error('RabbitMQ consumer is not ready');
        }
      },
    }),
  );
  app.use(createCompanySpecialistsRouter(service));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
