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

export interface CompanySpecialistWithSpecialistRow extends CompanySpecialistRow {
  specialist?: {
    id: string;
    displayName: string;
  };
}

export interface CompanySpecialistRequestWithSpecialistRow extends CompanySpecialistRequestRow {
  specialist?: {
    id: string;
    displayName: string;
  };
}

function mapSpecialistJoin<T extends { specialistId: string | null; specialistDisplayName: string | null }>(
  rows: T[],
): Array<Omit<T, 'specialistId' | 'specialistDisplayName'> & { specialist?: { id: string; displayName: string } }> {
  return rows.map(({ specialistId, specialistDisplayName, ...row }) => ({
    ...row,
    ...(specialistId
      ? { specialist: { id: specialistId, displayName: specialistDisplayName?.trim() || 'Specialist' } }
      : {}),
  }));
}

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

  async listByCompanyWithSpecialist(companyId: string): Promise<CompanySpecialistRequestWithSpecialistRow[]> {
    const rows = await this.dataSource.query<
      Array<
        CompanySpecialistRequestRow & {
          specialistId: string | null;
          specialistDisplayName: string | null;
        }
      >
    >(
      `
        SELECT
          request."id",
          request."companyId",
          request."specialistProfileId",
          request."requestedByUserId",
          request."status",
          request."message",
          request."respondedAt",
          request."createdAt",
          request."updatedAt",
          specialist."id" AS "specialistId",
          specialist."displayName" AS "specialistDisplayName"
        FROM company_specialists_schema.company_specialist_requests request
        LEFT JOIN specialists_schema.specialist_profiles specialist
          ON specialist."id" = request."specialistProfileId"
        WHERE request."companyId" = $1
        ORDER BY request."createdAt" DESC
      `,
      [companyId],
    );

    return mapSpecialistJoin(rows);
  }

  async listActiveRelationsByCompany(companyId: string): Promise<CompanySpecialistRow[]> {
    return this.dataSource.getRepository(CompanySpecialistEntity).find({
      where: { companyId, status: 'active' },
      order: { startedAt: 'DESC' },
    });
  }

  async listActiveRelationsByCompanyWithSpecialist(companyId: string): Promise<CompanySpecialistWithSpecialistRow[]> {
    const rows = await this.dataSource.query<
      Array<
        CompanySpecialistRow & {
          specialistId: string | null;
          specialistDisplayName: string | null;
        }
      >
    >(
      `
        SELECT
          relation."id",
          relation."companyId",
          relation."specialistProfileId",
          relation."status",
          relation."startedAt",
          relation."endedAt",
          relation."createdAt",
          relation."updatedAt",
          specialist."id" AS "specialistId",
          specialist."displayName" AS "specialistDisplayName"
        FROM company_specialists_schema.company_specialists relation
        LEFT JOIN specialists_schema.specialist_profiles specialist
          ON specialist."id" = relation."specialistProfileId"
        WHERE relation."companyId" = $1
          AND relation."status" = 'active'
        ORDER BY relation."startedAt" DESC
      `,
      [companyId],
    );

    return mapSpecialistJoin(rows);
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

  async endRelation(manager: EntityManager, id: string): Promise<CompanySpecialistRow> {
    const repository = manager.getRepository(CompanySpecialistEntity);
    const existing = await repository.findOneOrFail({ where: { id } });
    return repository.save(
      repository.merge(existing, { status: 'removed', endedAt: new Date(), updatedAt: new Date() }),
    );
  }
}
