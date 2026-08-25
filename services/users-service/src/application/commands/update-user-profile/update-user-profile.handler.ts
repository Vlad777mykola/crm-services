import type { UserProfileRow } from '../../../db/user-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { UserReadRepository, UserWriteRepository } from '../../ports/user-repositories.js';
import type { UpdateUserProfileCommand } from './update-user-profile.command.js';

export class UpdateUserProfileHandler {
  constructor(
    private readonly reads: UserReadRepository,
    private readonly writes: UserWriteRepository,
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<UserProfileRow> {
    const existing = await this.reads.findById(command.userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }
    const updated = await this.writes.updateProfile(command.userId, command.patch);
    return updated!;
  }
}
