import type { PoolClient } from 'pg';

import type { UserRepository } from '../db/user-repository.js';
import { logger } from '../logger.js';

/** Matches contracts/events/auth.user_registered.v1.json's `data` shape. */
export interface AuthUserRegisteredData {
  userId: string;
  email: string;
  name: string;
}

export async function handleAuthUserRegistered(
  client: PoolClient,
  data: AuthUserRegisteredData,
  users: UserRepository,
): Promise<void> {
  await users.createProfileIfMissing(client, data);
  logger.info({ userId: data.userId }, '[users-service] profile created from auth.user_registered');
}
