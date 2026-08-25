import type { UserProfileRow } from '../../../db/user-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { OutboxRepository } from '../../../outbox/outbox-repository.js';
import type { UserReadRepository, UserWriteRepository } from '../../ports/user-repositories.js';
import type { UpdateUserProfileCommand } from './update-user-profile.command.js';

export class UpdateUserProfileHandler {
  constructor(
    private readonly reads: UserReadRepository,
    private readonly writes: UserWriteRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<UserProfileRow> {
    const existing = await this.reads.findById(command.userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }
    return this.writes.withTransaction(async (manager) => {
      const updated = await this.writes.updateProfile(manager, command.userId, command.patch);
      if (!updated) {
        throw new AppError('User not found', 404);
      }
      await this.outbox.recordUserProfileEvent(manager, {
        type: 'user.profile_updated',
        userId: updated.id,
        correlationId: command.correlationId ?? null,
        payload: {
          userId: updated.id,
          email: updated.email,
          name: updated.name,
          phone: updated.phone,
        },
      });
      return updated;
    });
  }
}
