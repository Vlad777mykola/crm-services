import type { Pool, PoolClient } from 'pg';

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ.
 *
 * Company-members-service (Phase 5) now owns `company_members_schema.company_members`
 * - this file used to write directly to legacy's `public.company_members`
 * (Phase 4), but that write moved to company-members-service's own
 * `company.created` consumer (see
 * services/company-members-service/src/handlers/company-created.ts).
 *
 * What's left here is read-only, for companies-service's own authorization
 * needs (PATCH/status-history permission checks, "my companies"): reading
 * another service's schema directly instead of a local event-fed projection
 * (the pattern auth-service uses for `auth_membership_projection`, Task 5.4).
 * This is a deliberate, documented compromise, not the target architecture -
 * a future cleanup could give companies-service its own
 * `company_members_projection` fed by `company-member.*` events instead.
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

export async function listActiveCompanyIdsForUser(
  client: Pool | PoolClient,
  userId: string,
): Promise<Array<{ companyId: string; role: CompanyMemberRole }>> {
  const { rows } = await client.query<{ companyId: string; role: CompanyMemberRole }>(
    `SELECT "companyId", "role" FROM company_members_schema.company_members
     WHERE "userId" = $1 AND "status" = 'active'
     ORDER BY "createdAt" DESC`,
    [userId],
  );
  return rows;
}
