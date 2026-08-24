import type { DataSource, EntityManager } from 'typeorm';

import {
  SpecialistProfileEntity,
  type SpecialistProfileRow,
  type SpecialistStatus,
} from './entities/specialist-profile.entity.js';
import {
  SpecialistStatusHistoryEntity,
  type StatusHistoryRow,
} from './entities/specialist-status-history.entity.js';

export type { SpecialistProfileRow, SpecialistStatus } from './entities/specialist-profile.entity.js';
export type { StatusHistoryRow } from './entities/specialist-status-history.entity.js';

export class SpecialistRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByUserId(userId: string): Promise<SpecialistProfileRow | null> {
    return this.dataSource.getRepository(SpecialistProfileEntity).findOne({ where: { userId } });
  }

  async findByUserIdWithManager(manager: EntityManager, userId: string): Promise<SpecialistProfileRow | null> {
    return manager.getRepository(SpecialistProfileEntity).findOne({ where: { userId } });
  }

  async findById(specialistId: string): Promise<SpecialistProfileRow | null> {
    return this.dataSource.getRepository(SpecialistProfileEntity).findOne({ where: { id: specialistId } });
  }

  async insert(
    manager: EntityManager,
    input: {
      userId: string;
      displayName: string;
      headline: string | null;
      bio: string | null;
      category: string | null;
      city: string | null;
      isRemoteSupported: boolean;
    },
  ): Promise<SpecialistProfileRow> {
    const repository = manager.getRepository(SpecialistProfileEntity);
    return repository.save(repository.create({ ...input, status: 'draft' }));
  }

  async update(
    manager: EntityManager,
    userId: string,
    patch: Partial<{
      displayName: string;
      headline: string | null;
      bio: string | null;
      category: string | null;
      city: string | null;
      isRemoteSupported: boolean;
      status: SpecialistStatus;
    }>,
  ): Promise<SpecialistProfileRow> {
    const repository = manager.getRepository(SpecialistProfileEntity);
    const existing = await repository.findOneOrFail({ where: { userId } });
    return repository.save(repository.merge(existing, patch, { updatedAt: new Date() }));
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    city?: string;
    remoteOnly?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: SpecialistProfileRow[]; total: number }> {
    const query = this.dataSource
      .getRepository(SpecialistProfileEntity)
      .createQueryBuilder('specialist')
      .where('specialist.status = :status', { status: 'published' })
      .orderBy('specialist.createdAt', 'DESC')
      .take(filters.take)
      .skip(filters.skip);

    if (filters.q) {
      query.andWhere(
        '(specialist.displayName ILIKE :q OR specialist.headline ILIKE :q OR specialist.bio ILIKE :q)',
        { q: `%${filters.q}%` },
      );
    }
    if (filters.category) {
      query.andWhere('specialist.category ILIKE :category', { category: `%${filters.category}%` });
    }
    if (filters.city) {
      query.andWhere('specialist.city ILIKE :city', { city: `%${filters.city}%` });
    }
    if (filters.remoteOnly) {
      query.andWhere('specialist.isRemoteSupported = true');
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  async insertStatusHistory(
    manager: EntityManager,
    input: {
      specialistProfileId: string;
      fromStatus: string | null;
      toStatus: string;
      changedByUserId: string | null;
    },
  ): Promise<void> {
    await manager.getRepository(SpecialistStatusHistoryEntity).insert(input);
  }

  async listStatusHistory(specialistProfileId: string): Promise<StatusHistoryRow[]> {
    return this.dataSource.getRepository(SpecialistStatusHistoryEntity).find({
      where: { specialistProfileId },
      order: { createdAt: 'DESC' },
    });
  }
}
