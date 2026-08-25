import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createReviewsRouter } from './http/routes/reviews.routes.js';
import { logger } from './logger.js';
import type { ReviewsService } from './modules/reviews/reviews.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(dataSource: DataSource, consumer: RabbitMqConsumer, reviewsService: ReviewsService): Express {
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
  app.use(createReviewsRouter(reviewsService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
