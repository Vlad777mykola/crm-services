import type { Pool, PoolClient } from 'pg';

export interface UserProfileRow {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT_JOIN = `
  SELECT u."id", u."email", u."status", u."createdAt" AS "userCreatedAt",
         p."name", p."phone", p."city", p."bio", p."updatedAt"
  FROM users_schema.users u
  JOIN users_schema.user_profiles p ON p."userId" = u."id"
`;

function toProfileRow(row: {
  id: string;
  email: string | null;
  status: string;
  userCreatedAt: Date;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  updatedAt: Date;
}): UserProfileRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    city: row.city,
    bio: row.bio,
    status: row.status,
    createdAt: row.userCreatedAt,
    updatedAt: row.updatedAt,
  };
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Idempotent: `ON CONFLICT DO NOTHING` means a redelivered
   * `auth.user_registered` event (RabbitMQ's at-least-once delivery) never
   * overwrites or duplicates the profile - safe alongside the
   * `processed_events` check in the consumer, which is the primary guard.
   */
  async createProfileIfMissing(
    client: PoolClient,
    input: { userId: string; email: string; name: string },
  ): Promise<void> {
    await client.query(
      `INSERT INTO users_schema.users ("id", "email") VALUES ($1, $2) ON CONFLICT ("id") DO NOTHING`,
      [input.userId, input.email],
    );
    await client.query(
      `INSERT INTO users_schema.user_profiles ("userId", "name") VALUES ($1, $2) ON CONFLICT ("userId") DO NOTHING`,
      [input.userId, input.name],
    );
  }

  async findById(userId: string): Promise<UserProfileRow | undefined> {
    const { rows } = await this.pool.query(`${SELECT_JOIN} WHERE u."id" = $1 LIMIT 1`, [userId]);
    return rows[0] ? toProfileRow(rows[0]) : undefined;
  }

  async updateProfile(
    userId: string,
    patch: { name?: string; phone?: string | null; city?: string | null; bio?: string | null },
  ): Promise<UserProfileRow | undefined> {
    const columns = Object.keys(patch) as Array<keyof typeof patch>;
    if (columns.length > 0) {
      const setClauses = columns.map((col, i) => `"${col}" = $${i + 2}`);
      const values = columns.map((col) => patch[col]);
      await this.pool.query(
        `UPDATE users_schema.user_profiles SET ${setClauses.join(', ')}, "updatedAt" = now() WHERE "userId" = $1`,
        [userId, ...values],
      );
    }
    return this.findById(userId);
  }
}
