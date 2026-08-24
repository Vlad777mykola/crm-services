import { Router } from 'express';
import type { DataSource } from 'typeorm';

/** Schemas dashboard reads directly (from dashboard.service.ts SQL). */
const REQUIRED_SCHEMAS = [
  'notifications_schema',
  'company_members_schema',
  'companies_schema',
  'specialists_schema',
  'appointments_schema',
  'company_specialists_schema',
  'services_schema',
];

export function createHealthRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', (_req, res) => {
    const schemaList = REQUIRED_SCHEMAS.map((s) => `'${s}'`).join(', ');
    dataSource
      .query<Array<{ schema_name: string }>>(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (${schemaList})`,
      )
      .then((result) => {
        if (result.length !== REQUIRED_SCHEMAS.length) {
          throw new Error('Required dashboard schemas are missing');
        }
        res.status(200).json({ status: 'ok' });
      })
      .catch(() => res.status(503).json({ status: 'not-ready' }));
  });

  return router;
}
