import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { CompanyEntity } from './entities/company.entity.js';
import { CompanyInsightProjectionEntity } from './entities/company-insight-projection.entity.js';
import { CompanyStatusHistoryEntity } from './entities/company-status-history.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [
      CompanyEntity,
      CompanyStatusHistoryEntity,
      CompanyInsightProjectionEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
    ],
    synchronize: false,
    logging: false,
  });
}
