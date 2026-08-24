import type { DataSource, EntityManager } from 'typeorm';

import {
  CompanySpecialistRequestEntity,
  type CompanySpecialistRequestRow,
} from './entities/company-specialist-request.entity.js';
import { CompanySpecialistEntity, type CompanySpecialistRow } from './entities/company-specialist.entity.js';

export type {
  CompanySpecialistRequestRow,
  RequestStatus,
} from './entities/company-specialist-request.entity.js';
export type { CompanySpecialistRow, RelationStatus } from './entities/company-specialist.entity.js';

export class CompanySpecialistRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findActiveRelation(companyId: string, specialistProfileId: string): Promise<CompanySpecialistRow | null> {
    return this.dataSource.getRepository(CompanySpecialistEntity).findOne({
      where: { companyId, specialistProfileId, status: 'active' },
    });
  }

  async findPendingRequest(
    companyId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow | null> {
    return this.dataSource.getRepository(CompanySpecialistRequestEntity).findOne({
      where: { companyId, specialistProfileId, status: 'pending' },
    });
  }

  async insertRequest(input: {
    companyId: string;
    specialistProfileId: string;
    requestedByUserId: string;
    message: string | null;
  }): Promise<CompanySpecialistRequestRow> {
    const repository = this.dataSource.getRepository(CompanySpecialistRequestEntity);
    return repository.save(repository.create({ ...input, status: 'pending' }));
  }

  async listByCompany(companyId: string): Promise<CompanySpecialistRequestRow[]> {
    return this.dataSource.getRepository(CompanySpecialistRequestEntity).find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async listActiveRelationsByCompany(companyId: string): Promise<CompanySpecialistRow[]> {
    return this.dataSource.getRepository(CompanySpecialistEntity).find({
      where: { companyId, status: 'active' },
      order: { startedAt: 'DESC' },
    });
  }

  async listBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRequestRow[]> {
    return this.dataSource.getRepository(CompanySpecialistRequestEntity).find({
      where: { specialistProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async listActiveRelationsBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRow[]> {
    return this.dataSource.getRepository(CompanySpecialistEntity).find({
      where: { specialistProfileId, status: 'active' },
      order: { startedAt: 'DESC' },
    });
  }

  async findPendingRequestForSpecialist(
    requestId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow | null> {
    return this.dataSource.getRepository(CompanySpecialistRequestEntity).findOne({
      where: { id: requestId, specialistProfileId },
    });
  }

  async markRequestResponded(
    manager: EntityManager,
    requestId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    await manager.getRepository(CompanySpecialistRequestEntity).update(
      { id: requestId },
      { status, respondedAt: new Date(), updatedAt: new Date() },
    );
  }

  async upsertActiveRelation(
    manager: EntityManager,
    companyId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRow> {
    const repository = manager.getRepository(CompanySpecialistEntity);
    const existing = await repository.findOne({ where: { companyId, specialistProfileId } });

    if (existing) {
      return repository.save(
        repository.merge(existing, {
          status: 'active',
          startedAt: new Date(),
          endedAt: null,
          updatedAt: new Date(),
        }),
      );
    }

    return repository.save(repository.create({ companyId, specialistProfileId, status: 'active', endedAt: null }));
  }
}
