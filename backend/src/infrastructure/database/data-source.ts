import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { env } from '@/env/env.js';
import { AuthIdentity } from '@/modules/auth/identities/auth-identity.entity.js';
import { Session } from '@/modules/auth/sessions/session.entity.js';
import { User } from '@/modules/users/user.entity.js';

const isProduction = env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [User, AuthIdentity, Session],
  migrations: [
    isProduction
      ? 'dist/infrastructure/database/migrations/*.js'
      : 'src/infrastructure/database/migrations/*.ts',
  ],
  migrationsTableName: 'migrations',
});
