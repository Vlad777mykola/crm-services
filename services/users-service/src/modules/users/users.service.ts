import { AppError } from '../../errors/AppError.js';
import type { UserProfileRow } from '../../db/user-repository.js';
import { UserRepository } from '../../db/user-repository.js';
import type { UpdateUserRequestInput } from './users.schemas.js';

export class UsersService {
  private readonly users: UserRepository;

  constructor(repository: UserRepository) {
    this.users = repository;
  }

  async getById(userId: string): Promise<UserProfileRow> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateProfile(userId: string, patch: UpdateUserRequestInput): Promise<UserProfileRow> {
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }
    const updated = await this.users.updateProfile(userId, patch);
    return updated!;
  }
}
