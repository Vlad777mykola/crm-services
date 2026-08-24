import type { DataSource, EntityManager } from 'typeorm';

import {
  AppointmentCompanyProjectionEntity,
  type CompanyProjectionRow,
} from './entities/appointment-company-projection.entity.js';
import { AppointmentMembershipProjectionEntity } from './entities/appointment-membership-projection.entity.js';
import { AppointmentServiceSpecialistProjectionEntity } from './entities/appointment-service-specialist-projection.entity.js';
import {
  AppointmentServiceProjectionEntity,
  type ServiceProjectionRow,
} from './entities/appointment-service-projection.entity.js';

export type { CompanyProjectionRow } from './entities/appointment-company-projection.entity.js';
export type { ServiceProjectionRow } from './entities/appointment-service-projection.entity.js';

export type UpsertServiceProjectionInput = Omit<ServiceProjectionRow, 'updatedAt'>;

export class ProjectionsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertMembership(manager: EntityManager, companyId: string, userId: string, role: string): Promise<void> {
    await manager.getRepository(AppointmentMembershipProjectionEntity).upsert(
      { companyId, userId, role, updatedAt: new Date() },
      { conflictPaths: ['companyId', 'userId'] },
    );
  }

  async removeMembership(manager: EntityManager, companyId: string, userId: string): Promise<void> {
    await manager.getRepository(AppointmentMembershipProjectionEntity).delete({ companyId, userId });
  }

  async findMembershipRole(companyId: string, userId: string): Promise<string | undefined> {
    const row = await this.dataSource
      .getRepository(AppointmentMembershipProjectionEntity)
      .findOne({ where: { companyId, userId } });
    return row?.role;
  }

  async upsertCompany(manager: EntityManager, companyId: string, name: string): Promise<void> {
    await manager
      .getRepository(AppointmentCompanyProjectionEntity)
      .upsert({ companyId, name, updatedAt: new Date() }, { conflictPaths: ['companyId'] });
  }

  async findCompany(companyId: string): Promise<CompanyProjectionRow | null> {
    return this.dataSource.getRepository(AppointmentCompanyProjectionEntity).findOne({ where: { companyId } });
  }

  async upsertService(manager: EntityManager, input: UpsertServiceProjectionInput): Promise<void> {
    await manager
      .getRepository(AppointmentServiceProjectionEntity)
      .upsert({ ...input, updatedAt: new Date() }, { conflictPaths: ['serviceId'] });
  }

  async findService(serviceId: string): Promise<ServiceProjectionRow | null> {
    return this.dataSource.getRepository(AppointmentServiceProjectionEntity).findOne({ where: { serviceId } });
  }

  async upsertServiceSpecialist(
    manager: EntityManager,
    serviceId: string,
    specialistProfileId: string,
  ): Promise<void> {
    await manager.getRepository(AppointmentServiceSpecialistProjectionEntity).upsert(
      { serviceId, specialistProfileId, updatedAt: new Date() },
      { conflictPaths: ['serviceId', 'specialistProfileId'] },
    );
  }

  async removeServiceSpecialist(
    manager: EntityManager,
    serviceId: string,
    specialistProfileId: string,
  ): Promise<void> {
    await manager.getRepository(AppointmentServiceSpecialistProjectionEntity).delete({ serviceId, specialistProfileId });
  }

  async isServiceSpecialistAssigned(serviceId: string, specialistProfileId: string): Promise<boolean> {
    return this.dataSource.getRepository(AppointmentServiceSpecialistProjectionEntity).exists({
      where: { serviceId, specialistProfileId },
    });
  }
}
