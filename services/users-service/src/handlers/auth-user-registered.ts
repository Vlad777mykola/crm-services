import { logger } from '../logger.js';
import type { UserRepository } from '../db/user-repository.js';

/** Matches contracts/events/auth.user_registered.v1.json's `data` shape. */
export interface AuthUserRegisteredData {
  userId: string;
  email: string;
  name: string;
}

export async function handleAuthUserRegistered(data: AuthUserRegisteredData, users: UserRepository): Promise<void> {
  await users.createProfileIfMissing(data);
  logger.info({ userId: data.userId }, '[users-service] profile created from auth.user_registered');
}
