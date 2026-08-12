import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - same pattern/rationale as
 * services/companies-service/src/db/legacy-company-members-bridge.ts.
 * `requireCompanyRole` (owner/manager) needs company-members-service's data
 * for service create/update/status-history permission checks and to decide
 * whether draft/suspended services are visible to the requester.
 */

export type CompanyMemberRole = 'owner' | 'manager';

export async function findActiveMembershipRole(
  client: Pool | PoolClient,
  companyId: string,
  userId: string,
): Promise<CompanyMemberRole | undefined> {
  const { rows } = await client.query<{ role: CompanyMemberRole }>(
    `SELECT "role" FROM company_members_schema.company_members
     WHERE "companyId" = $1 AND "userId" = $2 AND "status" = 'active'
     LIMIT 1`,
    [companyId, userId],
  );
  return rows[0]?.role;
}
