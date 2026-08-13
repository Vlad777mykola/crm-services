import type { PoolClient } from 'pg';

export class MembershipProjectionRepository {
  async upsert(client: PoolClient, companyId: string, userId: string, role: string): Promise<void> {
    await client.query(
      `INSERT INTO auth_schema.auth_membership_projection ("companyId", "userId", "role")
       VALUES ($1, $2, $3)
       ON CONFLICT ("companyId", "userId") DO UPDATE SET "role" = $3, "updatedAt" = now()`,
      [companyId, userId, role],
    );
  }

  async remove(client: PoolClient, companyId: string, userId: string): Promise<void> {
    await client.query(
      `DELETE FROM auth_schema.auth_membership_projection WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId],
    );
  }
}
