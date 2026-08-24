import type { DataSource } from 'typeorm';

import { AuthSessionEntity, type AuthSessionRow } from './entities/auth-session.entity.js';

export type { AuthSessionRow } from './entities/auth-session.entity.js';

export class SessionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<AuthSessionRow> {
    const repository = this.dataSource.getRepository(AuthSessionEntity);
    return repository.save(repository.create(input));
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<AuthSessionRow | null> {
    return this.dataSource.getRepository(AuthSessionEntity).findOne({ where: { refreshTokenHash } });
  }

  async rotate(id: string, input: {
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<void> {
    await this.dataSource.getRepository(AuthSessionEntity).update({ id }, { ...input, updatedAt: new Date() });
  }

  async revoke(id: string): Promise<void> {
    await this.dataSource
      .getRepository(AuthSessionEntity)
      .update({ id }, { status: 'revoked', revokedAt: new Date(), updatedAt: new Date() });
  }
}
