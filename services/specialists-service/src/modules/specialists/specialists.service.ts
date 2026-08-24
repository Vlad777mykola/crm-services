import type { DataSource } from 'typeorm';

import { AppError } from '../../errors/AppError.js';
import type { SpecialistProfileRow, StatusHistoryRow } from '../../db/specialist-repository.js';
import { SpecialistRepository } from '../../db/specialist-repository.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../common/pagination.js';
import type {
  CreateSpecialistProfileRequestInput,
  PublicSpecialistsQueryInput,
  UpdateSpecialistProfileRequestInput,
} from './specialists.schemas.js';

const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export class SpecialistsService {
  private readonly specialists: SpecialistRepository;

  constructor(private readonly dataSource: DataSource) {
    this.specialists = new SpecialistRepository(dataSource);
  }

  async createMine(userId: string, input: CreateSpecialistProfileRequestInput): Promise<SpecialistProfileRow> {
    const existing = await this.specialists.findByUserId(userId);
    if (existing) {
      throw new AppError('This user already has a specialist profile', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const profile = await this.specialists.insert(manager, {
        userId,
        displayName: input.displayName,
        headline: input.headline ?? null,
        bio: input.bio ?? null,
        category: input.category ?? null,
        city: input.city ?? null,
        isRemoteSupported: input.isRemoteSupported ?? false,
      });

      await this.specialists.insertStatusHistory(manager, {
        specialistProfileId: profile.id,
        fromStatus: null,
        toStatus: profile.status,
        changedByUserId: userId,
      });

      await recordOutboxEvent(manager, {
        type: 'specialist.created',
        aggregateId: profile.id,
        payload: { specialistProfileId: profile.id, userId, displayName: profile.displayName },
      });

      return profile;
    });
  }

  async getMine(userId: string): Promise<SpecialistProfileRow> {
    const profile = await this.specialists.findByUserId(userId);
    if (!profile) throw new AppError('This user does not have a specialist profile yet', 404);
    return profile;
  }

  async updateMine(userId: string, patch: UpdateSpecialistProfileRequestInput): Promise<SpecialistProfileRow> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.specialists.findByUserIdWithManager(manager, userId);
      if (!existing) throw new AppError('This user does not have a specialist profile yet', 404);

      const fromStatus = existing.status;
      if (patch.status && patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This specialist profile has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.specialists.update(manager, userId, patch);

      if (updated.status !== fromStatus) {
        await this.specialists.insertStatusHistory(manager, {
          specialistProfileId: updated.id,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: userId,
        });
      }

      await recordOutboxEvent(manager, {
        type: 'specialist.updated',
        aggregateId: updated.id,
        payload: { specialistProfileId: updated.id, userId, status: updated.status },
      });

      return updated;
    });
  }

  async getMyStatusHistory(userId: string): Promise<StatusHistoryRow[]> {
    const profile = await this.specialists.findByUserId(userId);
    if (!profile) throw new AppError('This user does not have a specialist profile yet', 404);
    return this.specialists.listStatusHistory(profile.id);
  }

  async getPublic(query: PublicSpecialistsQueryInput): Promise<{ items: SpecialistProfileRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const { items, total } = await this.specialists.listPublic({
      q: query.q,
      category: query.category,
      city: query.city,
      remoteOnly: query.remoteOnly,
      skip,
      take,
    });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getById(specialistId: string, requesterUserId: string | undefined): Promise<SpecialistProfileRow> {
    const profile = await this.specialists.findById(specialistId);
    if (!profile) throw new AppError('Specialist profile not found', 404);

    if (profile.status === 'published') return profile;

    if (!requesterUserId || requesterUserId !== profile.userId) {
      throw new AppError('Specialist profile not found', 404);
    }
    return profile;
  }
}
