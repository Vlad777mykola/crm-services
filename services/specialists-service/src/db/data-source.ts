import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { PublicCompanyProjectionEntity } from './entities/public-company-projection.entity.js';
import { PublicServiceProjectionEntity } from './entities/public-service-projection.entity.js';
import { PublicSpecialistCompanyProjectionEntity } from './entities/public-specialist-company-projection.entity.js';
import { PublicSpecialistRatingSummaryEntity } from './entities/public-specialist-rating-summary.entity.js';
import { PublicSpecialistServiceProjectionEntity } from './entities/public-specialist-service-projection.entity.js';
import { SpecialistProfileEntity } from './entities/specialist-profile.entity.js';
import { SpecialistStatusHistoryEntity } from './entities/specialist-status-history.entity.js';
import { InitSpecialistsSchema2026082500001 } from './migrations/2026082500001-InitSpecialistsSchema.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    schema: 'specialists_schema',
    entities: [
      SpecialistProfileEntity,
      SpecialistStatusHistoryEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
      PublicCompanyProjectionEntity,
      PublicSpecialistCompanyProjectionEntity,
      PublicServiceProjectionEntity,
      PublicSpecialistServiceProjectionEntity,
      PublicSpecialistRatingSummaryEntity,
    ],
    migrations: [InitSpecialistsSchema2026082500001],
    migrationsTableName: 'typeorm_migrations_specialists',
    synchronize: false,
    logging: false,
  });
}

export const dataSource = createDataSource();
