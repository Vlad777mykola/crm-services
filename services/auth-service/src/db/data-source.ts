import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { AuthIdentityEntity } from './entities/auth-identity.entity.js';
import { AuthMembershipProjectionEntity } from './entities/auth-membership-projection.entity.js';
import { AuthSessionEntity } from './entities/auth-session.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [
      AuthIdentityEntity,
      AuthSessionEntity,
      AuthMembershipProjectionEntity,
      ProcessedEventEntity,
      OutboxEventEntity,
    ],
    synchronize: false,
    logging: false,
  });
}
