import type { UserProfileRow } from '../../../db/user-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { UserReadRepository } from '../../ports/user-repositories.js';
import type { GetUserProfileQuery } from './get-user-profile.query.js';

export class GetUserProfileHandler {
  constructor(private readonly reads: UserReadRepository) {}

  async execute(query: GetUserProfileQuery): Promise<UserProfileRow> {
    const user = await this.reads.findById(query.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
}
