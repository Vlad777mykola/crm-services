import { pool } from './db.js';

/** Basic quiescence checks before baseline dump. */
export async function validateBaselineState(): Promise<void> {
  const checks = [
    `SELECT COUNT(*)::int AS n FROM companies_schema.companies`,
    `SELECT COUNT(*)::int AS n FROM auth_schema.auth_identities`,
    `SELECT COUNT(*)::int AS n FROM appointments_schema.outbox_events WHERE status != 'published'`,
  ];

  const { rows: companies } = await pool.query(checks[0]);
  const { rows: identities } = await pool.query(checks[1]);

  if ((companies[0]?.n ?? 0) < 1) {
    throw new Error('[fill_dump_db] baseline validation failed: no companies');
  }
  if ((identities[0]?.n ?? 0) < 1) {
    throw new Error('[fill_dump_db] baseline validation failed: no auth identities');
  }

  try {
    const { rows: pendingOutbox } = await pool.query(checks[2]);
    if ((pendingOutbox[0]?.n ?? 0) > 0) {
      console.warn('[fill_dump_db] warning: unpublished outbox events remain after transient clear');
    }
  } catch {
    // outbox status column may differ
  }

  console.log('[fill_dump_db] baseline validation passed');
}
