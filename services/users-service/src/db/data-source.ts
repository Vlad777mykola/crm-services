import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';
import { UserEntity } from './entities/user.entity.js';
import { UserProfileEntity } from './entities/user-profile.entity.js';
import { InitUsersSchema2026082500001 } from './migrations/2026082500001-InitUsersSchema.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    schema: 'users_schema',
    entities: [UserEntity, UserProfileEntity, ProcessedEventEntity, OutboxEventEntity],
    migrations: [InitUsersSchema2026082500001],
    migrationsTableName: 'typeorm_migrations_users',
    synchronize: false,
    logging: false,
  });
}

export const dataSource = createDataSource();
