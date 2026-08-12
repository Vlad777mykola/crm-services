import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - resolves "my specialist
 * profile id" from a `userId` for `GET /specialists/me/services`. No public
 * lookup endpoint exists on specialists-service yet.
 */
export async function findSpecialistProfileIdByUserId(
  client: Pool | PoolClient,
  userId: string,
): Promise<string | undefined> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT "id" FROM specialists_schema.specialist_profiles WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.id;
}
