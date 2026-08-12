import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - same pattern/rationale as
 * legacy-company-members-bridge.ts. Needs specialists-service's data to
 * validate a `specialistProfileId` exists on `sendSpecialistRequest`, and to
 * resolve "my specialist profile id" from a `userId` for the
 * specialist-facing endpoints. No public lookup endpoint exists on
 * specialists-service yet.
 */

export interface SpecialistProfileRow {
  id: string;
  userId: string;
}

export async function findSpecialistProfileById(
  client: Pool | PoolClient,
  specialistProfileId: string,
): Promise<SpecialistProfileRow | undefined> {
  const { rows } = await client.query<SpecialistProfileRow>(
    `SELECT "id", "userId" FROM specialists_schema.specialist_profiles WHERE "id" = $1 LIMIT 1`,
    [specialistProfileId],
  );
  return rows[0];
}

export async function findSpecialistProfileByUserId(
  client: Pool | PoolClient,
  userId: string,
): Promise<SpecialistProfileRow | undefined> {
  const { rows } = await client.query<SpecialistProfileRow>(
    `SELECT "id", "userId" FROM specialists_schema.specialist_profiles WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  return rows[0];
}
