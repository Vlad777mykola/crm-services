import type { PoolClient } from 'pg';

export interface CompanyManagerUser {
  userId: string;
  email: string;
}

/**
 * Read-only queries against `users` and `company_members` for recipient
 * lookup - the only access this service has to tables it doesn't own. Never
 * writes to either table. See docs/architecture/service-ownership.md.
 */
export class RecipientRepository {
  async getUserEmail(client: PoolClient, userId: string): Promise<string | null> {
    const { rows } = await client.query<{ email: string }>('SELECT "email" FROM "users" WHERE "id" = $1', [userId]);
    return rows[0]?.email ?? null;
  }

  async getCompanyManagerUsers(client: PoolClient, companyId: string): Promise<CompanyManagerUser[]> {
    const { rows } = await client.query<CompanyManagerUser>(
      `SELECT u."id" AS "userId", u."email" AS "email"
       FROM "company_members" cm
       JOIN "users" u ON u."id" = cm."userId"
       WHERE cm."companyId" = $1 AND cm."status" = 'active'`,
      [companyId],
    );
    return rows;
  }
}
