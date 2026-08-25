import express, { type Express } from 'express';
import type { DataSource } from 'typeorm';

import {
  createErrorHandler,
  createHealthRouter,
  createNotFoundHandler,
  createRequestIdMiddleware,
  createRequestLogger,
} from '@crm/http-kit';

import { createDashboardRouter } from './http/routes/dashboard.routes.js';
import { logger } from './logger.js';
import type { DashboardService } from './modules/dashboard/dashboard.service.js';

const REQUIRED_SCHEMAS = [
  'notifications_schema',
  'company_members_schema',
  'companies_schema',
  'specialists_schema',
  'appointments_schema',
  'company_specialists_schema',
  'services_schema',
];

export function createApp(dataSource: DataSource, dashboardService: DashboardService): Express {
  const app = express();

  app.use(createRequestIdMiddleware());
  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.use(
    createHealthRouter({
      readiness: async () => {
        const schemaList = REQUIRED_SCHEMAS.map((schema) => `'${schema}'`).join(', ');
        const result = await dataSource.query<Array<{ schema_name: string }>>(
          `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (${schemaList})`,
        );
        if (result.length !== REQUIRED_SCHEMAS.length) {
          throw new Error('Required dashboard schemas are missing');
        }
      },
    }),
  );
  app.use(createDashboardRouter(dashboardService));

  app.use(createNotFoundHandler());
  app.use(createErrorHandler(logger));

  return app;
}
