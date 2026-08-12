import type { Pool, PoolClient } from 'pg';

export type MemberRole = 'owner' | 'manager';
export type MemberStatus = 'active' | 'removed';

export interface MemberRow {
  id: string;
  companyId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberRepository {
  constructor(private readonly pool: Pool) {}

  async insertOwner(client: PoolClient, companyId: string, userId: string): Promise<MemberRow | undefined> {
    const { rows } = await client.query<MemberRow>(
      `INSERT INTO company_members_schema.company_members ("companyId", "userId", "role", "status")
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT ("companyId", "userId") DO NOTHING
       RETURNING *`,
      [companyId, userId],
    );
    return rows[0];
  }

  async findByCompanyAndUser(companyId: string, userId: string): Promise<MemberRow | undefined> {
    const { rows } = await this.pool.query<MemberRow>(
      `SELECT * FROM company_members_schema.company_members WHERE "companyId" = $1 AND "userId" = $2 LIMIT 1`,
      [companyId, userId],
    );
    return rows[0];
  }

  async findById(companyId: string, memberId: string): Promise<MemberRow | undefined> {
    const { rows } = await this.pool.query<MemberRow>(
      `SELECT * FROM company_members_schema.company_members WHERE "id" = $1 AND "companyId" = $2 LIMIT 1`,
      [memberId, companyId],
    );
    return rows[0];
  }

  async listByCompany(companyId: string): Promise<MemberRow[]> {
    const { rows } = await this.pool.query<MemberRow>(
      `SELECT * FROM company_members_schema.company_members WHERE "companyId" = $1 ORDER BY "createdAt" ASC`,
      [companyId],
    );
    return rows;
  }

  async upsertManager(client: PoolClient, companyId: string, userId: string): Promise<{ row: MemberRow; wasReactivated: boolean }> {
    const existing = await client.query<MemberRow>(
      `SELECT * FROM company_members_schema.company_members WHERE "companyId" = $1 AND "userId" = $2 LIMIT 1`,
      [companyId, userId],
    );

    if (existing.rows[0]) {
      const { rows } = await client.query<MemberRow>(
        `UPDATE company_members_schema.company_members SET "status" = 'active', "role" = 'manager', "updatedAt" = now()
         WHERE "id" = $1 RETURNING *`,
        [existing.rows[0].id],
      );
      return { row: rows[0], wasReactivated: true };
    }

    const { rows } = await client.query<MemberRow>(
      `INSERT INTO company_members_schema.company_members ("companyId", "userId", "role", "status")
       VALUES ($1, $2, 'manager', 'active') RETURNING *`,
      [companyId, userId],
    );
    return { row: rows[0], wasReactivated: false };
  }

  async setStatus(client: PoolClient, memberId: string, status: MemberStatus): Promise<MemberRow> {
    const { rows } = await client.query<MemberRow>(
      `UPDATE company_members_schema.company_members SET "status" = $2, "updatedAt" = now()
       WHERE "id" = $1 RETURNING *`,
      [memberId, status],
    );
    return rows[0];
  }
}

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ.
 *
 * `GET .../members` and invite-by-email need user identity data
 * (email -> userId lookup, and name for display) that lives in
 * users-service's own schema. There's no public "find user by email" HTTP
 * endpoint anywhere (users-service only exposes GET /users/:id and /users/me),
 * so this reads users_schema directly (same physical Postgres instance) -
 * same documented compromise pattern as
 * services/companies-service/src/db/legacy-company-members-bridge.ts.
 * A real fix would add a users-service endpoint or an event-fed local
 * projection; flagged here for a future cleanup, not required by
 * microservices-extraction-checklist.md Phase 5.
 */
export async function findUserIdByEmail(pool: Pool, email: string): Promise<string | undefined> {
  const { rows } = await pool.query<{ id: string }>(`SELECT "id" FROM users_schema.users WHERE "email" = $1 LIMIT 1`, [
    email,
  ]);
  return rows[0]?.id;
}

export async function findUserNamesByIds(pool: Pool, userIds: string[]): Promise<Map<string, { name: string; email: string | null }>> {
  if (userIds.length === 0) return new Map();
  const { rows } = await pool.query<{ id: string; email: string | null; name: string }>(
    `SELECT u."id", u."email", p."name" FROM users_schema.users u
     JOIN users_schema.user_profiles p ON p."userId" = u."id"
     WHERE u."id" = ANY($1)`,
    [userIds],
  );
  return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
}
