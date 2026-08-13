import { pool } from './db.js';

const TRANSIENT_TABLES = [
  'appointments_schema.outbox_events',
  'appointments_schema.processed_events',
  'users_schema.outbox_events',
  'users_schema.processed_events',
  'company_members_schema.outbox_events',
  'company_members_schema.processed_events',
  'companies_schema.outbox_events',
  'companies_schema.processed_events',
  'services_schema.outbox_events',
  'services_schema.processed_events',
  'auth_schema.outbox_events',
  'auth_schema.processed_events',
  'reviews_schema.outbox_events',
  'reviews_schema.processed_events',
  'notifications_schema.processed_events',
  'specialists_schema.outbox_events',
  'specialists_schema.processed_events',
  'company_specialists_schema.outbox_events',
  'company_specialists_schema.processed_events',
  'auth_schema.auth_sessions',
];

/** Clear async processing state before baseline dump. */
export async function clearTransientState(): Promise<void> {
  for (const qualified of TRANSIENT_TABLES) {
    try {
      await pool.query(`TRUNCATE TABLE ${qualified} RESTART IDENTITY CASCADE`);
    } catch {
      // table may not exist in older schemas
    }
  }
  console.log(`[fill_dump_db] cleared transient state (${TRANSIENT_TABLES.length} table(s))`);
}
