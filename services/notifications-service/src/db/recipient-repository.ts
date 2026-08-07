import type { Pool } from 'pg';

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
  constructor(private readonly pool: Pool) {}

  async getUserEmail(userId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ email: string }>('SELECT "email" FROM "users" WHERE "id" = $1', [userId]);
    return rows[0]?.email ?? null;
  }

  async getCompanyManagerUsers(companyId: string): Promise<CompanyManagerUser[]> {
    const { rows } = await this.pool.query<CompanyManagerUser>(
      `SELECT u."id" AS "userId", u."email" AS "email"
       FROM "company_members" cm
       JOIN "users" u ON u."id" = cm."userId"
       WHERE cm."companyId" = $1 AND cm."status" = 'active'`,
      [companyId],
    );
    return rows;
  }
}
