import { pool } from './db.js';
import { ensureAllMicroserviceSchemas } from './ensure-schemas.js';

/** Tables `seed.ts` inserts into — separate from full reset scope. */
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

/**
 * Every mutable business/state table across owned microservice schemas.
 * Audited from service `ensure*Schema()` definitions.
 */
export const RESETTABLE_APPLICATION_TABLES = [
  // appointments_schema
  'appointments_schema.appointments',
  'appointments_schema.appointment_status_history',
  'appointments_schema.appointment_membership_projection',
  'appointments_schema.appointment_company_projection',
  'appointments_schema.appointment_service_projection',
  'appointments_schema.appointment_service_specialist_projection',
  'appointments_schema.appointment_recommendation_projections',
  'appointments_schema.processed_events',
  'appointments_schema.outbox_events',
  // users_schema
  'users_schema.users',
  'users_schema.user_profiles',
  'users_schema.processed_events',
  'users_schema.outbox_events',
  // company_members_schema
  'company_members_schema.company_members',
  'company_members_schema.member_invitations',
  'company_members_schema.processed_events',
  'company_members_schema.outbox_events',
  // companies_schema
  'companies_schema.companies',
  'companies_schema.company_status_history',
  'companies_schema.company_insight_projections',
  'companies_schema.processed_events',
  'companies_schema.outbox_events',
  // services_schema
  'services_schema.services',
  'services_schema.service_specialists',
  'services_schema.service_status_history',
  'services_schema.processed_events',
  'services_schema.outbox_events',
  // auth_schema
  'auth_schema.auth_identities',
  'auth_schema.auth_sessions',
  'auth_schema.auth_membership_projection',
  'auth_schema.processed_events',
  'auth_schema.outbox_events',
  // reviews_schema
  'reviews_schema.reviews',
  'reviews_schema.processed_events',
  'reviews_schema.outbox_events',
  // notifications_schema
  'notifications_schema.notifications',
  'notifications_schema.email_logs',
  'notifications_schema.processed_events',
  // specialists_schema
  'specialists_schema.specialist_profiles',
  'specialists_schema.specialist_status_history',
  'specialists_schema.processed_events',
  'specialists_schema.outbox_events',
  // company_specialists_schema
  'company_specialists_schema.company_specialist_requests',
  'company_specialists_schema.company_specialists',
  'company_specialists_schema.processed_events',
  'company_specialists_schema.outbox_events',
];

async function listExistingResettableTables(): Promise<string[]> {
  const existing: string[] = [];
  for (const qualified of RESETTABLE_APPLICATION_TABLES) {
    const { rows } = await pool.query(`SELECT to_regclass($1::text) IS NOT NULL AS ok`, [qualified]);
    if (rows[0]?.ok) existing.push(qualified);
  }
  return existing;
}

/** Wipes only companies_schema tables seeded by `seed:companies`. */
export async function resetMicroserviceSchemas(): Promise<void> {
  await ensureAllMicroserviceSchemas();
  await pool.query(`TRUNCATE TABLE companies_schema.companies RESTART IDENTITY CASCADE`);
  console.log('[fill_dump_db] truncated companies_schema.companies (and dependent rows)');
}

/** Verify listed tables are empty (defaults to existing resettable tables). */
export async function assertResetComplete(tables?: string[]): Promise<void> {
  const toCheck = tables ?? await listExistingResettableTables();
  for (const qualified of toCheck) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${qualified}`);
    const count = rows[0]?.n ?? 0;
    if (count > 0) {
      throw new Error(`[fill_dump_db] reset incomplete: ${qualified} still has ${count} row(s)`);
    }
  }
  console.log(`[fill_dump_db] verified ${toCheck.length} table(s) empty`);
}

/**
 * Remove all application data/state while preserving structure.
 */
export async function resetAllApplicationState(): Promise<void> {
  await ensureAllMicroserviceSchemas();
  const tables = await listExistingResettableTables();
  if (tables.length === 0) {
    console.log('[fill_dump_db] no application tables to truncate yet');
    return;
  }
  await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`[fill_dump_db] truncated ${tables.length} application table(s)`);
  await assertResetComplete(tables);
}

/** @deprecated use resetAllApplicationState */
export async function resetDatabase(): Promise<void> {
  await resetAllApplicationState();
}
