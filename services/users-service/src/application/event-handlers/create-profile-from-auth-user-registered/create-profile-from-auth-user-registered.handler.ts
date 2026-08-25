import type { EntityManager } from 'typeorm';

import { logger } from '../../../logger.js';
import type { OutboxRepository } from '../../../outbox/outbox-repository.js';
import type { UserWriteRepository } from '../../ports/user-repositories.js';
import type { AuthUserRegisteredData } from './create-profile-from-auth-user-registered.event.js';

export class CreateProfileFromAuthUserRegisteredHandler {
  constructor(
    private readonly users: UserWriteRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async handle(
    manager: EntityManager,
    data: AuthUserRegisteredData,
    meta: { correlationId?: string | null; causationId?: string | null } = {},
  ): Promise<void> {
    await this.users.createProfileIfMissing(manager, data);
    await this.outbox.recordUserProfileEvent(manager, {
      type: 'user.profile_created',
      userId: data.userId,
      correlationId: meta.correlationId ?? null,
      causationId: meta.causationId ?? null,
      payload: {
        userId: data.userId,
        email: data.email,
        name: data.name,
        phone: null,
      },
    });
    logger.info({ userId: data.userId }, '[users-service] profile created from auth.user_registered');
  }
}
