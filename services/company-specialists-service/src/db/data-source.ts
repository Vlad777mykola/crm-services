import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { CompanySpecialistEntity } from './entities/company-specialist.entity.js';
import { CompanySpecialistRequestEntity } from './entities/company-specialist-request.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [CompanySpecialistRequestEntity, CompanySpecialistEntity, ProcessedEventEntity, OutboxEventEntity],
    synchronize: false,
    logging: false,
  });
}
