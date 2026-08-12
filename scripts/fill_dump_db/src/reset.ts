import { pool } from './db.js';
import { ensureAllMicroserviceSchemas } from './ensure-schemas.js';

/** Tables seeded by `seed.ts` — truncate with CASCADE so FKs are handled. */
export const SEEDED_TABLES = [
  'notifications_schema.email_logs',
  'notifications_schema.notifications',
  'reviews_schema.reviews',
  'appointments_schema.appointments',
  'services_schema.services',
  'company_specialists_schema.company_specialists',
  'company_specialists_schema.company_specialist_requests',
  'specialists_schema.specialist_profiles',
  'company_members_schema.company_members',
  'companies_schema.companies',
  'auth_schema.auth_membership_projection',
  'auth_schema.auth_identities',
  'users_schema.users',
];

/** Wipes only companies_schema tables seeded by `seed:companies`. */
export async function resetMicroserviceSchemas(): Promise<void> {
  await ensureAllMicroserviceSchemas();
  await pool.query(`TRUNCATE TABLE companies_schema.companies RESTART IDENTITY CASCADE`);
  console.log('[fill_dump_db] truncated companies_schema.companies (and dependent rows)');
}

/**
 * Wipes every microservice table this script seeds — dev/test only.
 */
export async function resetDatabase(): Promise<void> {
  await ensureAllMicroserviceSchemas();
  const tableList = SEEDED_TABLES.join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`[fill_dump_db] truncated ${SEEDED_TABLES.length} microservice table(s)`);
}
