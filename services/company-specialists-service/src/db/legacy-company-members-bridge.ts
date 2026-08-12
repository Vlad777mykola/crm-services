import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ - same pattern/rationale as
 * services/companies-service/src/db/legacy-company-members-bridge.ts.
 * `requireCompanyRole` (owner/manager) needs company-members-service's data;
 * there's no public "check my role" endpoint on that service yet, so this
 * reads company_members_schema directly instead of maintaining a local
 * projection. A future cleanup could replace this with an event-fed
 * projection, same as auth-service's `auth_membership_projection`.
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
