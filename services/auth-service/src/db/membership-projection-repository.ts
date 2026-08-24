import type { EntityManager } from 'typeorm';

import { AuthMembershipProjectionEntity } from './entities/auth-membership-projection.entity.js';

export class MembershipProjectionRepository {
  async upsert(manager: EntityManager, companyId: string, userId: string, role: string): Promise<void> {
    await manager.getRepository(AuthMembershipProjectionEntity).upsert(
      { companyId, userId, role, updatedAt: new Date() },
      { conflictPaths: ['companyId', 'userId'] },
    );
  }

  async remove(manager: EntityManager, companyId: string, userId: string): Promise<void> {
    await manager.getRepository(AuthMembershipProjectionEntity).delete({ companyId, userId });
  }
}
