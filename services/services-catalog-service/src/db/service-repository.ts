import type { DataSource, EntityManager } from 'typeorm';

import { ServiceSpecialistEntity, type ServiceSpecialistRow } from './entities/service-specialist.entity.js';
import {
  ServiceStatusHistoryEntity,
  type StatusHistoryRow,
} from './entities/service-status-history.entity.js';
import { ServiceEntity, type ServiceRow, type ServiceStatus } from './entities/service.entity.js';

export type { ServiceSpecialistRow } from './entities/service-specialist.entity.js';
export type { StatusHistoryRow } from './entities/service-status-history.entity.js';
export type { ServiceRow, ServiceStatus } from './entities/service.entity.js';

export interface ServiceSpecialistWithSpecialistRow extends ServiceSpecialistRow {
  specialist?: {
    id: string;
    displayName: string;
  };
}

export class ServiceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async insert(
    manager: EntityManager,
    input: {
      companyId: string;
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number;
      price: string | null;
    },
  ): Promise<ServiceRow> {
    const repository = manager.getRepository(ServiceEntity);
    return repository.save(repository.create({ ...input, status: 'draft' }));
  }

  async findById(serviceId: string): Promise<ServiceRow | null> {
    return this.dataSource.getRepository(ServiceEntity).findOne({ where: { id: serviceId } });
  }

  async findByIdAndCompany(serviceId: string, companyId: string): Promise<ServiceRow | null> {
    return this.dataSource.getRepository(ServiceEntity).findOne({ where: { id: serviceId, companyId } });
  }

  async listByCompany(companyId: string, publishedOnly: boolean): Promise<ServiceRow[]> {
    const repository = this.dataSource.getRepository(ServiceEntity);
    return repository.find({
      where: publishedOnly ? { companyId, status: 'published' } : { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    skip: number;
    take: number;
  }): Promise<{ items: ServiceRow[]; total: number }> {
    const query = this.dataSource
      .getRepository(ServiceEntity)
      .createQueryBuilder('service')
      .where('service.status = :status', { status: 'published' });

    if (filters.q) {
      query.andWhere('(service.name ILIKE :q OR service.description ILIKE :q)', { q: `%${filters.q}%` });
    }
    if (filters.category) {
      query.andWhere('service.category ILIKE :category', { category: `%${filters.category}%` });
    }

    const [items, total] = await query
      .orderBy('service.createdAt', 'DESC')
      .skip(filters.skip)
      .take(filters.take)
      .getManyAndCount();

    return { items, total };
  }

  async update(
    manager: EntityManager,
    serviceId: string,
    patch: Partial<{
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number;
      price: string | null;
      status: ServiceStatus;
    }>,
  ): Promise<ServiceRow> {
    const repository = manager.getRepository(ServiceEntity);
    await repository.update({ id: serviceId }, { ...patch, updatedAt: new Date() });
    return (await repository.findOne({ where: { id: serviceId } }))!;
  }

  async insertStatusHistory(
    manager: EntityManager,
    input: { serviceId: string; fromStatus: string | null; toStatus: string; changedByUserId: string | null },
  ): Promise<void> {
    const repository = manager.getRepository(ServiceStatusHistoryEntity);
    await repository.save(repository.create(input));
  }

  async listStatusHistory(serviceId: string): Promise<StatusHistoryRow[]> {
    return this.dataSource.getRepository(ServiceStatusHistoryEntity).find({
      where: { serviceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAssignment(serviceId: string, specialistProfileId: string): Promise<ServiceSpecialistRow | null> {
    return this.dataSource.getRepository(ServiceSpecialistEntity).findOne({
      where: { serviceId, specialistProfileId },
    });
  }

  async insertAssignment(
    manager: EntityManager,
    input: { serviceId: string; companyId: string; specialistProfileId: string },
  ): Promise<ServiceSpecialistRow> {
    const repository = manager.getRepository(ServiceSpecialistEntity);
    return repository.save(repository.create(input));
  }

  async listAssignmentsByService(serviceId: string): Promise<ServiceSpecialistRow[]> {
    return this.dataSource.getRepository(ServiceSpecialistEntity).find({
      where: { serviceId },
      order: { createdAt: 'ASC' },
    });
  }

  async listAssignmentsByServiceWithSpecialist(serviceId: string): Promise<ServiceSpecialistWithSpecialistRow[]> {
    const rows = await this.dataSource.query<
      Array<
        ServiceSpecialistRow & {
          specialistId: string | null;
          specialistDisplayName: string | null;
        }
      >
    >(
      `
        SELECT
          assignment."id",
          assignment."serviceId",
          assignment."companyId",
          assignment."specialistProfileId",
          assignment."createdAt",
          specialist."id" AS "specialistId",
          specialist."displayName" AS "specialistDisplayName"
        FROM services_schema.service_specialists assignment
        LEFT JOIN specialists_schema.specialist_profiles specialist
          ON specialist."id" = assignment."specialistProfileId"
        WHERE assignment."serviceId" = $1
        ORDER BY assignment."createdAt" ASC
      `,
      [serviceId],
    );

    return rows.map(({ specialistId, specialistDisplayName, ...row }) => ({
      ...row,
      ...(specialistId && specialistDisplayName
        ? { specialist: { id: specialistId, displayName: specialistDisplayName } }
        : {}),
    }));
  }

  async listAssignmentsBySpecialist(specialistProfileId: string): Promise<ServiceSpecialistRow[]> {
    return this.dataSource.getRepository(ServiceSpecialistEntity).find({
      where: { specialistProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeAssignment(manager: EntityManager, serviceId: string, specialistProfileId: string): Promise<void> {
    await manager.getRepository(ServiceSpecialistEntity).delete({ serviceId, specialistProfileId });
  }
}
