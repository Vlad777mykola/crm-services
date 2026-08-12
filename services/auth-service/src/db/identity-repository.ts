import type { Pool, PoolClient } from 'pg';

export interface AuthIdentityRow {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT_COLUMNS = `"id", "provider", "providerUserId", "email", "passwordHash", "createdAt", "updatedAt"`;

export class IdentityRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<AuthIdentityRow | undefined> {
    const { rows } = await this.pool.query<AuthIdentityRow>(
      `SELECT ${SELECT_COLUMNS} FROM auth_schema.auth_identities WHERE "email" = $1 LIMIT 1`,
      [email],
    );
    return rows[0];
  }

  async findById(id: string): Promise<AuthIdentityRow | undefined> {
    const { rows } = await this.pool.query<AuthIdentityRow>(
      `SELECT ${SELECT_COLUMNS} FROM auth_schema.auth_identities WHERE "id" = $1 LIMIT 1`,
      [id],
    );
    return rows[0];
  }

  /** Runs inside the caller's transaction (see auth.service.ts `register()`). */
  async create(
    client: PoolClient,
    input: { provider: string; providerUserId: string; email: string; passwordHash: string },
  ): Promise<AuthIdentityRow> {
    const { rows } = await client.query<AuthIdentityRow>(
      `INSERT INTO auth_schema.auth_identities ("provider", "providerUserId", "email", "passwordHash")
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [input.provider, input.providerUserId, input.email, input.passwordHash],
    );
    return rows[0]!;
  }
}
