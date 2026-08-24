import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createReviewsRouter } from './http/routes/reviews.routes.js';
import type { ReviewsService } from './modules/reviews/reviews.service.js';

export function createApp(dataSource: DataSource, reviewsService: ReviewsService): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(dataSource));
  app.use(createReviewsRouter(reviewsService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
