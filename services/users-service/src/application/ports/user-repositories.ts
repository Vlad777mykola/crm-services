import type { EntityManager } from 'typeorm';

import type { UserProfileRow } from '../../db/user-repository.js';

export interface CreateUserProfileIfMissingInput {
  userId: string;
  email: string;
  name: string;
}

export interface UpdateUserProfilePatch {
  name?: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
}

export interface UserReadRepository {
  findById(userId: string): Promise<UserProfileRow | null>;
}

export interface UserWriteRepository {
  createProfileIfMissing(manager: EntityManager, input: CreateUserProfileIfMissingInput): Promise<void>;
  updateProfile(userId: string, patch: UpdateUserProfilePatch): Promise<UserProfileRow | null>;
}
