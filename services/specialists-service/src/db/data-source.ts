import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { SpecialistProfileEntity } from './entities/specialist-profile.entity.js';
import { SpecialistStatusHistoryEntity } from './entities/specialist-status-history.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [SpecialistProfileEntity, SpecialistStatusHistoryEntity, ProcessedEventEntity, OutboxEventEntity],
    synchronize: false,
    logging: false,
  });
}
