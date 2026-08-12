import type { Pool } from 'pg';

export interface AuthSessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  status: 'active' | 'revoked';
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT_COLUMNS = `"id", "userId", "refreshTokenHash", "status", "userAgent", "ipAddress", "expiresAt", "revokedAt", "createdAt", "updatedAt"`;

export class SessionRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<AuthSessionRow> {
    const { rows } = await this.pool.query<AuthSessionRow>(
      `INSERT INTO auth_schema.auth_sessions ("userId", "refreshTokenHash", "userAgent", "ipAddress", "expiresAt")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [input.userId, input.refreshTokenHash, input.userAgent, input.ipAddress, input.expiresAt],
    );
    return rows[0]!;
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthSessionRow | undefined> {
    const { rows } = await this.pool.query<AuthSessionRow>(
      `SELECT ${SELECT_COLUMNS} FROM auth_schema.auth_sessions WHERE "refreshTokenHash" = $1 LIMIT 1`,
      [refreshTokenHash],
    );
    return rows[0];
  }

  async rotate(id: string, input: {
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE auth_schema.auth_sessions
       SET "refreshTokenHash" = $2, "expiresAt" = $3, "userAgent" = $4, "ipAddress" = $5, "updatedAt" = now()
       WHERE "id" = $1`,
      [id, input.refreshTokenHash, input.expiresAt, input.userAgent, input.ipAddress],
    );
  }

  async revoke(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_schema.auth_sessions SET "status" = 'revoked', "revokedAt" = now(), "updatedAt" = now() WHERE "id" = $1`,
      [id],
    );
  }
}
