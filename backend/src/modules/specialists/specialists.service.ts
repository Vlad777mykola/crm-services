import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';

import { SpecialistProfile, SpecialistProfileStatus } from './specialist-profile.entity.js';
import type { CreateSpecialistProfileRequestInput, UpdateSpecialistProfileRequestInput } from './specialists.schemas.js';

function getSpecialistRepository(): Repository<SpecialistProfile> {
  return AppDataSource.getRepository(SpecialistProfile);
}

export async function createMySpecialistProfile(
  userId: string,
  input: CreateSpecialistProfileRequestInput,
): Promise<SpecialistProfile> {
  const repository = getSpecialistRepository();

  const existing = await repository.findOne({ where: { userId } });
  if (existing) {
    throw new AppError('This user already has a specialist profile', 409);
  }

  const profile = repository.create({
    userId,
    displayName: input.displayName,
    headline: input.headline ?? null,
    bio: input.bio ?? null,
    category: input.category ?? null,
    city: input.city ?? null,
    isRemoteSupported: input.isRemoteSupported ?? false,
    status: SpecialistProfileStatus.DRAFT,
  });

  return repository.save(profile);
}

export async function getMySpecialistProfile(userId: string): Promise<SpecialistProfile> {
  const repository = getSpecialistRepository();

  const profile = await repository.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }

  return profile;
}

export async function updateMySpecialistProfile(
  userId: string,
  patch: UpdateSpecialistProfileRequestInput,
): Promise<SpecialistProfile> {
  const repository = getSpecialistRepository();

  const profile = await repository.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }

  Object.assign(profile, patch);
  return repository.save(profile);
}

export async function getPublicSpecialists(): Promise<SpecialistProfile[]> {
  const repository = getSpecialistRepository();
  return repository.find({ where: { status: SpecialistProfileStatus.PUBLISHED }, order: { createdAt: 'DESC' } });
}

export async function getSpecialistById(
  specialistId: string,
  requesterUserId: string | undefined,
): Promise<SpecialistProfile> {
  const repository = getSpecialistRepository();
  const profile = await repository.findOne({ where: { id: specialistId } });

  if (!profile) {
    throw new AppError('Specialist profile not found', 404);
  }

  if (profile.status === SpecialistProfileStatus.PUBLISHED) {
    return profile;
  }

  // Draft/suspended profiles are only visible to their owner - report "not found"
  // (rather than 403) so anonymous visitors can't detect their existence.
  if (!requesterUserId || requesterUserId !== profile.userId) {
    throw new AppError('Specialist profile not found', 404);
  }

  return profile;
}
