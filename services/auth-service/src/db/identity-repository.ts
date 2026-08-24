import type { DataSource, EntityManager } from 'typeorm';

import { AuthIdentityEntity, type AuthIdentityRow } from './entities/auth-identity.entity.js';

export type { AuthIdentityRow } from './entities/auth-identity.entity.js';

export class IdentityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByEmail(email: string): Promise<AuthIdentityRow | null> {
    return this.dataSource.getRepository(AuthIdentityEntity).findOne({ where: { email } });
  }

  async findById(id: string): Promise<AuthIdentityRow | null> {
    return this.dataSource.getRepository(AuthIdentityEntity).findOne({ where: { id } });
  }

  /** Runs inside the caller's transaction (see auth.service.ts `register()`). */
  async create(
    manager: EntityManager,
    input: { provider: string; providerUserId: string; email: string; passwordHash: string },
  ): Promise<AuthIdentityRow> {
    const repository = manager.getRepository(AuthIdentityEntity);
    return repository.save(repository.create(input));
  }
}
