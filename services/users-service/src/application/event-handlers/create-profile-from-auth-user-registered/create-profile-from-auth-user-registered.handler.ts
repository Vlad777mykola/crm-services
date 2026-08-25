import type { EntityManager } from 'typeorm';

import { logger } from '../../../logger.js';
import type { UserWriteRepository } from '../../ports/user-repositories.js';
import type { AuthUserRegisteredData } from './create-profile-from-auth-user-registered.event.js';

export class CreateProfileFromAuthUserRegisteredHandler {
  constructor(private readonly users: UserWriteRepository) {}

  async handle(manager: EntityManager, data: AuthUserRegisteredData): Promise<void> {
    await this.users.createProfileIfMissing(manager, data);
    logger.info({ userId: data.userId }, '[users-service] profile created from auth.user_registered');
  }
}
