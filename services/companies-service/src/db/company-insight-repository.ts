import type { EntityManager } from 'typeorm';

import { CompanyInsightProjectionEntity } from './entities/company-insight-projection.entity.js';
import type { CompanyInsightProjection } from './entities/company-insight-projection.entity.js';

export class CompanyInsightRepository {
  async upsert(manager: EntityManager, projection: Omit<CompanyInsightProjection, 'createdAt'>): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(CompanyInsightProjectionEntity)
      .values(projection)
      .orIgnore()
      .execute();
  }
}
