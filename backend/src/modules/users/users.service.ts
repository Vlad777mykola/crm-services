import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';

import { User } from './user.entity.js';

function getUserRepository(): Repository<User> {
  return AppDataSource.getRepository(User);
}

export async function createUser(input: { email: string; name: string }): Promise<User> {
  const repository = getUserRepository();

  const existing = await repository.findOne({ where: { email: input.email } });
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const user = repository.create(input);
  return repository.save(user);
}

export async function getUserById(id: string): Promise<User> {
  const repository = getUserRepository();

  const user = await repository.findOne({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  patch: { name?: string; phone?: string | null; city?: string | null; bio?: string | null },
): Promise<User> {
  const repository = getUserRepository();

  const user = await repository.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  Object.assign(user, patch);
  return repository.save(user);
}
