import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';

import { env } from './env.js';
import { errorHandler } from './http/error-handler.js';
import { createHealthRouter } from './http/health.routes.js';
import { notFoundHandler } from './http/not-found-handler.js';
import { requestLogger } from './http/request-logger.js';
import { createAppointmentsRouter } from './http/routes/appointments.routes.js';
import type { AppointmentsService } from './modules/appointments/appointments.service.js';
import type { RabbitMqConsumer } from './rabbitmq/consumer.js';

export function createApp(pool: Pool, consumer: RabbitMqConsumer, appointmentsService: AppointmentsService): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json());
  app.use(requestLogger);

  app.use(createHealthRouter(pool, consumer));
  app.use(createAppointmentsRouter(appointmentsService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
