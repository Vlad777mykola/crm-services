import type { Pool } from 'pg';

/**
 * Local, eventually-consistent projection fed by `company-member.*` events -
 * see docs/architecture/microservices-extraction-checklist.md Phase 5 Task
 * 5.4. Permission checks read this table, never company-members-service's
 * schema directly and never call it synchronously over HTTP.
 */
export class MembershipProjectionRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(companyId: string, userId: string, role: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_schema.auth_membership_projection ("companyId", "userId", "role")
       VALUES ($1, $2, $3)
       ON CONFLICT ("companyId", "userId") DO UPDATE SET "role" = $3, "updatedAt" = now()`,
      [companyId, userId, role],
    );
  }

  async remove(companyId: string, userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM auth_schema.auth_membership_projection WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId],
    );
  }
}
