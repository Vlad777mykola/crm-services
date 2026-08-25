import type { DataSource, EntityManager } from 'typeorm';

export type CompanyMemberRole = 'owner' | 'manager';

type Queryable = DataSource | EntityManager;

export interface CompanyMembershipProjectionInput {
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
  status?: 'active' | 'removed';
}

export async function upsertMembershipProjection(
  client: Queryable,
  input: CompanyMembershipProjectionInput,
): Promise<void> {
  await client.query(
    `INSERT INTO services_schema.company_membership_projection
       ("companyId", "userId", "role", "status")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("companyId", "userId") DO UPDATE
     SET "role" = EXCLUDED."role",
         "status" = EXCLUDED."status",
         "updatedAt" = now()`,
    [input.companyId, input.userId, input.role, input.status ?? 'active'],
  );
}

export async function removeMembershipProjection(client: Queryable, companyId: string, userId: string): Promise<void> {
  await client.query(
    `UPDATE services_schema.company_membership_projection
     SET "status" = 'removed', "updatedAt" = now()
     WHERE "companyId" = $1 AND "userId" = $2`,
    [companyId, userId],
  );
}

export async function findActiveMembershipRole(
  client: Queryable,
  companyId: string,
  userId: string,
): Promise<CompanyMemberRole | undefined> {
  const rows = await client.query<Array<{ role: CompanyMemberRole }>>(
    `SELECT "role" FROM services_schema.company_membership_projection
     WHERE "companyId" = $1 AND "userId" = $2 AND "status" = 'active'
     LIMIT 1`,
    [companyId, userId],
  );
  return rows[0]?.role;
}
