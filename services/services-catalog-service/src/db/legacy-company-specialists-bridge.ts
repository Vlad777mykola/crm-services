import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - checking that a specialist
 * is an active company-specialist before assigning them to a service
 * (`POST /services/:serviceId/specialists`) needs company-specialists-service's
 * data. No public lookup endpoint exists there yet.
 */
export async function isActiveCompanySpecialist(
  client: Pool | PoolClient,
  companyId: string,
  specialistProfileId: string,
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM company_specialists_schema.company_specialists
     WHERE "companyId" = $1 AND "specialistProfileId" = $2 AND "status" = 'active'
     LIMIT 1`,
    [companyId, specialistProfileId],
  );
  return rows.length > 0;
}
