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
  createProfileFromPatch(
    manager: EntityManager,
    userId: string,
    patch: UpdateUserProfilePatch & { name: string },
  ): Promise<UserProfileRow | null>;
  updateProfile(
    manager: EntityManager,
    userId: string,
    patch: UpdateUserProfilePatch,
  ): Promise<UserProfileRow | null>;
  withTransaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T>;
}
