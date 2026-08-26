import { Brackets, type DataSource, type EntityManager } from 'typeorm';

import { AppointmentEntity, type AppointmentRow } from './entities/appointment.entity.js';
import { CompanyAvailabilityRuleEntity, type CompanyAvailabilityRuleRow } from './entities/company-availability-rule.entity.js';
import { CompanyTimeBlockEntity, type CompanyTimeBlockRow } from './entities/company-time-block.entity.js';
import {
  SpecialistAvailabilityRuleEntity,
  type SpecialistAvailabilityRuleRow,
} from './entities/specialist-availability-rule.entity.js';
import { SpecialistTimeBlockEntity, type SpecialistTimeBlockRow } from './entities/specialist-time-block.entity.js';

export interface BusyRange {
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilityRuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
  timezone?: string;
  active?: boolean;
}

export class AvailabilityRepository {
  constructor(private readonly dataSource: DataSource) {}

  withTransaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  async listCompanyRules(companyId: string): Promise<CompanyAvailabilityRuleRow[]> {
    return this.dataSource.getRepository(CompanyAvailabilityRuleEntity).find({
      where: { companyId, active: true },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });
  }

  async listSpecialistRules(companyId: string, specialistProfileId: string): Promise<SpecialistAvailabilityRuleRow[]> {
    return this.dataSource.getRepository(SpecialistAvailabilityRuleEntity).find({
      where: { companyId, specialistProfileId, active: true },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });
  }

  async setCompanyRules(
    manager: EntityManager,
    companyId: string,
    rules: AvailabilityRuleInput[],
  ): Promise<CompanyAvailabilityRuleRow[]> {
    const repository = manager.getRepository(CompanyAvailabilityRuleEntity);
    await repository.delete({ companyId });
    if (rules.length === 0) return [];
    return repository.save(
      rules.map((rule) =>
        repository.create({
          companyId,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          timezone: rule.timezone ?? 'UTC',
          active: rule.active ?? true,
        }),
      ),
    );
  }

  async setSpecialistRules(
    manager: EntityManager,
    companyId: string,
    specialistProfileId: string,
    rules: AvailabilityRuleInput[],
  ): Promise<SpecialistAvailabilityRuleRow[]> {
    const repository = manager.getRepository(SpecialistAvailabilityRuleEntity);
    await repository.delete({ companyId, specialistProfileId });
    if (rules.length === 0) return [];
    return repository.save(
      rules.map((rule) =>
        repository.create({
          companyId,
          specialistProfileId,
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          timezone: rule.timezone ?? 'UTC',
          active: rule.active ?? true,
        }),
      ),
    );
  }

  async listCompanyBlocksForManagement(companyId: string): Promise<CompanyTimeBlockRow[]> {
    return this.dataSource.getRepository(CompanyTimeBlockEntity).find({
      where: { companyId },
      order: { startsAt: 'ASC' },
    });
  }

  async listSpecialistBlocksForManagement(
    companyId: string,
    specialistProfileId: string,
  ): Promise<SpecialistTimeBlockRow[]> {
    return this.dataSource.getRepository(SpecialistTimeBlockEntity).find({
      where: { companyId, specialistProfileId },
      order: { startsAt: 'ASC' },
    });
  }

  async addCompanyBlock(
    manager: EntityManager,
    input: {
      companyId: string;
      startsAt: Date;
      endsAt: Date;
      reason: string | null;
      createdByUserId: string;
    },
  ): Promise<CompanyTimeBlockRow> {
    const repository = manager.getRepository(CompanyTimeBlockEntity);
    return repository.save(repository.create(input));
  }

  async addSpecialistBlock(
    manager: EntityManager,
    input: {
      companyId: string;
      specialistProfileId: string;
      startsAt: Date;
      endsAt: Date;
      reason: string | null;
      createdByUserId: string;
    },
  ): Promise<SpecialistTimeBlockRow> {
    const repository = manager.getRepository(SpecialistTimeBlockEntity);
    return repository.save(repository.create(input));
  }

  async removeCompanyBlock(manager: EntityManager, companyId: string, blockId: string): Promise<boolean> {
    const result = await manager.getRepository(CompanyTimeBlockEntity).delete({ id: blockId, companyId });
    return (result.affected ?? 0) > 0;
  }

  async removeSpecialistBlock(
    manager: EntityManager,
    companyId: string,
    specialistProfileId: string,
    blockId: string,
  ): Promise<boolean> {
    const result = await manager
      .getRepository(SpecialistTimeBlockEntity)
      .delete({ id: blockId, companyId, specialistProfileId });
    return (result.affected ?? 0) > 0;
  }

  async listCompanyBlocks(companyId: string, from: Date, to: Date): Promise<CompanyTimeBlockRow[]> {
    return this.dataSource
      .getRepository(CompanyTimeBlockEntity)
      .createQueryBuilder('block')
      .where('block.companyId = :companyId', { companyId })
      .andWhere('block.startsAt < :to', { to })
      .andWhere('block.endsAt > :from', { from })
      .orderBy('block.startsAt', 'ASC')
      .getMany();
  }

  async listSpecialistBlocks(
    companyId: string,
    specialistProfileId: string,
    from: Date,
    to: Date,
  ): Promise<SpecialistTimeBlockRow[]> {
    return this.dataSource
      .getRepository(SpecialistTimeBlockEntity)
      .createQueryBuilder('block')
      .where('block.companyId = :companyId', { companyId })
      .andWhere('block.specialistProfileId = :specialistProfileId', { specialistProfileId })
      .andWhere('block.startsAt < :to', { to })
      .andWhere('block.endsAt > :from', { from })
      .orderBy('block.startsAt', 'ASC')
      .getMany();
  }

  async listBusyAppointments(
    companyId: string,
    specialistProfileId: string,
    from: Date,
    to: Date,
    excludeAppointmentId?: string,
  ): Promise<AppointmentRow[]> {
    const query = this.dataSource
      .getRepository(AppointmentEntity)
      .createQueryBuilder('appointment')
      .where('appointment.companyId = :companyId', { companyId })
      .andWhere('appointment.specialistProfileId = :specialistProfileId', { specialistProfileId })
      .andWhere('appointment.startAt < :to', { to })
      .andWhere('appointment.endAt > :from', { from })
      .andWhere(
        new Brackets((qb) => {
          qb.where('appointment.status = :pending', { pending: 'pending' }).orWhere(
            'appointment.status = :approved',
            { approved: 'approved' },
          );
        }),
      )
      .orderBy('appointment.startAt', 'ASC');

    if (excludeAppointmentId) {
      query.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
    }

    return query.getMany();
  }
}
