import { pool } from './db.js';
import { ensureCompaniesSchema } from './seed-microservices.js';

// Every legacy public table this seed script touches. Order doesn't matter -
// TRUNCATE ... CASCADE below handles FKs.
export const SEEDED_TABLES = [
  'reviews',
  'notifications',
  'email_logs',
  'status_history_entries',
  'appointments',
  'service_specialists',
  'services',
  'company_specialists',
  'company_specialist_requests',
  'specialist_profiles',
  'company_members',
  'companies',
  'auth_sessions',
  'auth_identities',
  'users',
  'outbox_events',
];

/** Microservice-owned schemas mirrored by this script (companies-service reads these). */
export const MICROSERVICE_SEEDED_TABLES = ['companies_schema.companies'];

/**
 * Wipes microservice schema tables this script seeds. `companies` CASCADE clears
 * company_status_history and company_insight_projections too.
 */
export async function resetMicroserviceSchemas(): Promise<void> {
  await ensureCompaniesSchema();
  const tableList = MICROSERVICE_SEEDED_TABLES.join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`[fill_dump_db] truncated ${MICROSERVICE_SEEDED_TABLES.length} microservice table(s)`);
}

/**
 * Wipes every legacy + microservice table this script seeds - dev/test only.
 */
export async function resetDatabase(): Promise<void> {
  const tableList = SEEDED_TABLES.map((table) => `"${table}"`).join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`[fill_dump_db] truncated ${SEEDED_TABLES.length} legacy table(s)`);

  await resetMicroserviceSchemas();
}
