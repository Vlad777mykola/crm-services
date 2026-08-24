import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { EmailLogEntity } from './entities/email-log.entity.js';
import { NotificationEntity } from './entities/notification.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [NotificationEntity, EmailLogEntity, ProcessedEventEntity],
    synchronize: false,
    logging: false,
  });
}
