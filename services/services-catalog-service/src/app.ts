import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createServiceSpecialistsRouter } from './http/routes/service-specialists.routes.js';
import { createServicesRouter } from './http/routes/services.routes.js';
import { logger } from './logger.js';
import type { ServiceSpecialistsService } from './modules/services/service-specialists.service.js';
import type { ServicesService } from './modules/services/services.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(
  dataSource: DataSource,
  consumer: RabbitMqConsumer,
  servicesService: ServicesService,
  serviceSpecialistsService: ServiceSpecialistsService,
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
  app.use(createServicesRouter(servicesService));
  app.use(createServiceSpecialistsRouter(serviceSpecialistsService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
