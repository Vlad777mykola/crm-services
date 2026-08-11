import { pool } from './db.js';

// Every table this seed script touches, in one place, so add/remove/reset stay
// in sync. Order doesn't matter - TRUNCATE ... CASCADE below handles FKs.
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

/**
 * Wipes every table this script seeds - dev/test databases only, never point
 * this at anything you care about. `RESTART IDENTITY CASCADE` also resets any
 * sequences and follows FKs so table order above doesn't matter.
 */
export async function resetDatabase(): Promise<void> {
  const tableList = SEEDED_TABLES.map((table) => `"${table}"`).join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`[fill_dump_db] truncated ${SEEDED_TABLES.length} tables`);
}
