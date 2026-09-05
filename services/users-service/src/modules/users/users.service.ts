import { UpdateUserProfileHandler } from '../../application/commands/update-user-profile/update-user-profile.handler.js';
import { GetUserProfileHandler } from '../../application/queries/get-user-profile/get-user-profile.handler.js';
import type { UserProfileRow } from '../../db/user-repository.js';
import { UserRepository } from '../../db/user-repository.js';
import { OutboxRepository } from '../../outbox/outbox-repository.js';
import type { PublicUserProfile } from './users.contracts.js';
import type { UpdateUserRequestInput } from './users.schemas.js';

function toPublicProfile(user: UserProfileRow): PublicUserProfile {
  return { id: user.id, name: user.name, city: user.city, status: user.status };
}

export class UsersService {
  private readonly getUserProfileQuery: GetUserProfileHandler;
  private readonly updateUserProfileCommand: UpdateUserProfileHandler;

  constructor(repository: UserRepository, outbox: OutboxRepository) {
    this.getUserProfileQuery = new GetUserProfileHandler(repository);
    this.updateUserProfileCommand = new UpdateUserProfileHandler(repository, repository, outbox);
  }

  async getById(userId: string): Promise<UserProfileRow> {
    return this.getUserProfileQuery.execute({ userId });
  }

  /** Public, unauthenticated lookup - PII-free by construction (see PublicUserProfile). */
  async getPublicById(userId: string): Promise<PublicUserProfile> {
    const user = await this.getUserProfileQuery.execute({ userId });
    return toPublicProfile(user);
  }

  async updateProfile(userId: string, patch: UpdateUserRequestInput, correlationId?: string): Promise<UserProfileRow> {
    return this.updateUserProfileCommand.execute({ userId, patch, correlationId });
  }
}
