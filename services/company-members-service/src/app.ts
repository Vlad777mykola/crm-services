import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createMembersRouter } from './http/routes/members.routes.js';
import type { MembersService } from './modules/members/members.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(dataSource: DataSource, consumer: RabbitMqConsumer, membersService: MembersService): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(dataSource, consumer));
  app.use(createMembersRouter(membersService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
