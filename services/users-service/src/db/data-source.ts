import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { UserProfileEntity } from './entities/user-profile.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [UserEntity, UserProfileEntity, ProcessedEventEntity, OutboxEventEntity],
    synchronize: false,
    logging: false,
  });
}
