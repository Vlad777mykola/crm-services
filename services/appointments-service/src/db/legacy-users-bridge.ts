import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - same pattern/rationale as
 * the bridges in companies-service/company-specialists-service/etc.
 * `clientName` is required by the existing `appointment.requested.v1.json`/
 * `.cancelled.v1.json` schemas (Task 9.5: reuse as-is, no v2). There is no
 * `user.*` event carrying a display name (see event-catalog.md - `user.profile_created`
 * is unconfirmed/not implemented), so unlike the other three projections in
 * this service, this one cannot be event-fed today. Reads `users_schema`
 * directly instead.
 */
export async function findUserName(client: Pool | PoolClient, userId: string): Promise<string | undefined> {
  const { rows } = await client.query<{ name: string }>(
    `SELECT "name" FROM users_schema.user_profiles WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.name;
}
