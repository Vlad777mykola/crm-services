import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [],
    synchronize: false,
    logging: false,
  });
}
