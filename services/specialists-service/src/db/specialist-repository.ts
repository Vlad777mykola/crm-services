import type { Pool, PoolClient } from 'pg';

export type SpecialistStatus = 'draft' | 'published' | 'suspended';

export interface SpecialistProfileRow {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
  status: SpecialistStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusHistoryRow {
  id: string;
  specialistProfileId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export class SpecialistRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<SpecialistProfileRow | undefined> {
    const { rows } = await this.pool.query<SpecialistProfileRow>(
      `SELECT * FROM specialists_schema.specialist_profiles WHERE "userId" = $1 LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  async findByUserIdWithClient(client: PoolClient, userId: string): Promise<SpecialistProfileRow | undefined> {
    const { rows } = await client.query<SpecialistProfileRow>(
      `SELECT * FROM specialists_schema.specialist_profiles WHERE "userId" = $1 LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  async findById(specialistId: string): Promise<SpecialistProfileRow | undefined> {
    const { rows } = await this.pool.query<SpecialistProfileRow>(
      `SELECT * FROM specialists_schema.specialist_profiles WHERE "id" = $1 LIMIT 1`,
      [specialistId],
    );
    return rows[0];
  }

  async insert(
    client: PoolClient,
    input: {
      userId: string;
      displayName: string;
      headline: string | null;
      bio: string | null;
      category: string | null;
      city: string | null;
      isRemoteSupported: boolean;
    },
  ): Promise<SpecialistProfileRow> {
    const { rows } = await client.query<SpecialistProfileRow>(
      `INSERT INTO specialists_schema.specialist_profiles
         ("userId", "displayName", "headline", "bio", "category", "city", "isRemoteSupported", "status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
       RETURNING *`,
      [input.userId, input.displayName, input.headline, input.bio, input.category, input.city, input.isRemoteSupported],
    );
    return rows[0];
  }

  async update(
    client: PoolClient,
    userId: string,
    patch: Partial<{
      displayName: string;
      headline: string | null;
      bio: string | null;
      category: string | null;
      city: string | null;
      isRemoteSupported: boolean;
      status: SpecialistStatus;
    }>,
  ): Promise<SpecialistProfileRow> {
    const columns = Object.keys(patch) as Array<keyof typeof patch>;
    const setClauses = columns.map((col, i) => `"${col}" = $${i + 2}`);
    const values = columns.map((col) => patch[col]);
    const { rows } = await client.query<SpecialistProfileRow>(
      `UPDATE specialists_schema.specialist_profiles SET ${setClauses.join(', ')}, "updatedAt" = now()
       WHERE "userId" = $1 RETURNING *`,
      [userId, ...values],
    );
    return rows[0];
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    city?: string;
    remoteOnly?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: SpecialistProfileRow[]; total: number }> {
    const conditions: string[] = [`"status" = 'published'`];
    const params: unknown[] = [];

    if (filters.q) {
      params.push(`%${filters.q}%`);
      conditions.push(`("displayName" ILIKE $${params.length} OR "headline" ILIKE $${params.length} OR "bio" ILIKE $${params.length})`);
    }
    if (filters.category) {
      params.push(`%${filters.category}%`);
      conditions.push(`"category" ILIKE $${params.length}`);
    }
    if (filters.city) {
      params.push(`%${filters.city}%`);
      conditions.push(`"city" ILIKE $${params.length}`);
    }
    if (filters.remoteOnly) {
      conditions.push(`"isRemoteSupported" = true`);
    }

    const where = conditions.join(' AND ');
    const { rows: countRows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM specialists_schema.specialist_profiles WHERE ${where}`,
      params,
    );

    params.push(filters.take, filters.skip);
    const { rows } = await this.pool.query<SpecialistProfileRow>(
      `SELECT * FROM specialists_schema.specialist_profiles WHERE ${where}
       ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows, total: Number(countRows[0].count) };
  }

  async insertStatusHistory(
    client: PoolClient,
    input: { specialistProfileId: string; fromStatus: string | null; toStatus: string; changedByUserId: string | null },
  ): Promise<void> {
    await client.query(
      `INSERT INTO specialists_schema.specialist_status_history
         ("specialistProfileId", "fromStatus", "toStatus", "changedByUserId")
       VALUES ($1, $2, $3, $4)`,
      [input.specialistProfileId, input.fromStatus, input.toStatus, input.changedByUserId],
    );
  }

  async listStatusHistory(specialistProfileId: string): Promise<StatusHistoryRow[]> {
    const { rows } = await this.pool.query<StatusHistoryRow>(
      `SELECT * FROM specialists_schema.specialist_status_history WHERE "specialistProfileId" = $1 ORDER BY "createdAt" DESC`,
      [specialistProfileId],
    );
    return rows;
  }
}
