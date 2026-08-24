import type { DataSource, EntityManager } from 'typeorm';

import {
  AppointmentRecommendationProjectionEntity,
  type AppointmentRecommendationProjection,
} from './entities/appointment-recommendation-projection.entity.js';

export type { AppointmentRecommendationProjection } from './entities/appointment-recommendation-projection.entity.js';

export type AppointmentRecommendationProjectionInput = Omit<AppointmentRecommendationProjection, 'createdAt'>;

/** Moved from backend-projection-service in Phase 12 - see README "Known gaps". */
export class AppointmentRecommendationRepository {
  constructor(_dataSource: DataSource) {}

  async upsert(manager: EntityManager, projection: AppointmentRecommendationProjectionInput): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(AppointmentRecommendationProjectionEntity)
      .values(projection)
      .orIgnore()
      .execute();
  }
}
