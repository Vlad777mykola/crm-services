import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '@/common/schemas/pagination.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { AuditEntityType, type StatusHistoryEntry } from '@/modules/audit/status-history.entity.js';
import { listStatusHistory, recordStatusChange } from '@/modules/audit/status-history.service.js';
import { assertTransitionAllowed, PUBLISHABLE_STATUS_TRANSITIONS } from '@/modules/audit/status-transition.js';

import { SpecialistProfile, SpecialistProfileStatus } from './specialist-profile.entity.js';
import type {
  CreateSpecialistProfileRequestInput,
  PublicSpecialistsQueryInput,
  UpdateSpecialistProfileRequestInput,
} from './specialists.schemas.js';

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

  const saved = await repository.save(profile);
  await recordStatusChange(AuditEntityType.SPECIALIST_PROFILE, saved.id, null, saved.status, userId);

  return saved;
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

  const fromStatus = profile.status;
  if (patch.status && patch.status !== fromStatus) {
    assertTransitionAllowed(
      PUBLISHABLE_STATUS_TRANSITIONS,
      fromStatus,
      patch.status,
      fromStatus === SpecialistProfileStatus.SUSPENDED
        ? 'This specialist profile has been suspended and cannot be republished'
        : undefined,
    );
  }

  Object.assign(profile, patch);
  const saved = await repository.save(profile);

  if (saved.status !== fromStatus) {
    await recordStatusChange(AuditEntityType.SPECIALIST_PROFILE, saved.id, fromStatus, saved.status, userId);
  }

  return saved;
}

export async function getMySpecialistStatusHistory(userId: string): Promise<StatusHistoryEntry[]> {
  const profile = await getSpecialistRepository().findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('This user does not have a specialist profile yet', 404);
  }

  return listStatusHistory(AuditEntityType.SPECIALIST_PROFILE, profile.id);
}

export interface PublicSpecialistsResult {
  items: SpecialistProfile[];
  meta: PaginationMeta;
}

export async function getPublicSpecialists(query: PublicSpecialistsQueryInput): Promise<PublicSpecialistsResult> {
  const repository = getSpecialistRepository();
  const { page, pageSize, skip, take } = resolvePagination(query);

  const qb = repository
    .createQueryBuilder('specialist')
    .where('specialist.status = :status', { status: SpecialistProfileStatus.PUBLISHED });

  if (query.q) {
    qb.andWhere('(specialist.displayName ILIKE :q OR specialist.headline ILIKE :q OR specialist.bio ILIKE :q)', {
      q: `%${query.q}%`,
    });
  }
  if (query.category) {
    qb.andWhere('specialist.category ILIKE :category', { category: `%${query.category}%` });
  }
  if (query.city) {
    qb.andWhere('specialist.city ILIKE :city', { city: `%${query.city}%` });
  }
  if (query.remoteOnly) {
    qb.andWhere('specialist.isRemoteSupported = true');
  }

  qb.orderBy('specialist.createdAt', 'DESC').skip(skip).take(take);

  const [items, total] = await qb.getManyAndCount();

  return { items, meta: buildPaginationMeta(page, pageSize, total) };
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
