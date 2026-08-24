import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { ServiceSpecialistEntity } from './entities/service-specialist.entity.js';
import { ServiceStatusHistoryEntity } from './entities/service-status-history.entity.js';
import { ServiceEntity } from './entities/service.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [
      ServiceEntity,
      ServiceSpecialistEntity,
      ServiceStatusHistoryEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
    ],
    synchronize: false,
    logging: false,
  });
}
