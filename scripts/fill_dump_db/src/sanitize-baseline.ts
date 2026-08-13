import { pool } from './db.js';
import { SHARED_TEST_PASSWORD, TEST_ACCOUNTS } from './data/credentials.js';

/**
 * Scrub PII for team baseline — deterministic @example.test accounts.
 */
export async function sanitizeBaselineData(): Promise<void> {
  console.log('[fill_dump_db] sanitizing baseline data…');

  for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
    const slot = i + 1;
    const email = `user${slot}@example.test`;
    const account = TEST_ACCOUNTS[i];
    await pool.query(
      `UPDATE auth_schema.auth_identities SET email = $1, "providerUserId" = $1 WHERE email = $2`,
      [email, account.email],
    );
    await pool.query(`UPDATE users_schema.users SET email = $1 WHERE email = $2`, [email, account.email]);
    await pool.query(
      `UPDATE users_schema.user_profiles SET name = $1, phone = $2, city = 'Test City', bio = NULL WHERE "userId" IN (SELECT id FROM users_schema.users WHERE email = $3)`,
      [`Test User ${slot}`, `+1000000${String(slot).padStart(4, '0')}`, email],
    );
  }

  await pool.query(
    `UPDATE companies_schema.companies SET name = 'Test Company ' || id::text, description = 'Sanitized baseline company'`,
  );
  await pool.query(`UPDATE notifications_schema.notifications SET body = 'Sanitized notification' WHERE body IS NOT NULL`);
  await pool.query(`UPDATE notifications_schema.email_logs SET subject = 'Sanitized', body = 'Sanitized' WHERE body IS NOT NULL`);

  console.log('[fill_dump_db] sanitize complete (password remains Passw0rd!123 for seeded accounts)');
  void SHARED_TEST_PASSWORD;
}
