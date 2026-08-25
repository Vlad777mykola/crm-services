import { UpdateUserProfileHandler } from '../../application/commands/update-user-profile/update-user-profile.handler.js';
import { GetUserProfileHandler } from '../../application/queries/get-user-profile/get-user-profile.handler.js';
import type { UserProfileRow } from '../../db/user-repository.js';
import { UserRepository } from '../../db/user-repository.js';
import type { UpdateUserRequestInput } from './users.schemas.js';

export class UsersService {
  private readonly getUserProfileQuery: GetUserProfileHandler;
  private readonly updateUserProfileCommand: UpdateUserProfileHandler;

  constructor(repository: UserRepository) {
    this.getUserProfileQuery = new GetUserProfileHandler(repository);
    this.updateUserProfileCommand = new UpdateUserProfileHandler(repository, repository);
  }

  async getById(userId: string): Promise<UserProfileRow> {
    return this.getUserProfileQuery.execute({ userId });
  }

  async updateProfile(userId: string, patch: UpdateUserRequestInput): Promise<UserProfileRow> {
    return this.updateUserProfileCommand.execute({ userId, patch });
  }
}
