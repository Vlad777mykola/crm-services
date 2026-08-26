import type { DataSource, EntityManager } from 'typeorm';

import {
  AppointmentStatusHistoryEntity,
  type StatusHistoryRow,
} from './entities/appointment-status-history.entity.js';
import { AppointmentEntity, type AppointmentRow } from './entities/appointment.entity.js';

export type { StatusHistoryRow } from './entities/appointment-status-history.entity.js';
export type { AppointmentRow } from './entities/appointment.entity.js';

export interface CreateAppointmentInput {
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  requestedStartAt: Date;
  startAt: Date;
  endAt: Date;
  createdByUserId: string;
  notes: string | null;
}

export interface ListAppointmentsFilters {
  from?: Date;
  to?: Date;
  status?: string;
  serviceId?: string;
  specialistProfileId?: string;
  limit?: number;
}

export class AppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(manager: EntityManager, input: CreateAppointmentInput): Promise<AppointmentRow> {
    const repository = manager.getRepository(AppointmentEntity);
    return repository.save(repository.create({ ...input, status: 'pending' }));
  }

  async findById(id: string): Promise<AppointmentRow | null> {
    return this.dataSource.getRepository(AppointmentEntity).findOne({ where: { id } });
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<AppointmentRow | null> {
    return this.dataSource.getRepository(AppointmentEntity).findOne({ where: { id, companyId } });
  }

  async findByIdAndClient(id: string, clientUserId: string): Promise<AppointmentRow | null> {
    return this.dataSource.getRepository(AppointmentEntity).findOne({ where: { id, clientUserId } });
  }

  async listByCompany(companyId: string, filters: ListAppointmentsFilters = {}): Promise<AppointmentRow[]> {
    const query = this.appointmentListQuery().where('appointment.companyId = :companyId', { companyId });
    this.applyListFilters(query, filters);
    return query.getMany();
  }

  async listByClient(clientUserId: string, filters: ListAppointmentsFilters = {}): Promise<AppointmentRow[]> {
    const query = this.appointmentListQuery().where('appointment.clientUserId = :clientUserId', { clientUserId });
    this.applyListFilters(query, filters);
    return query.getMany();
  }

  async listBySpecialist(specialistProfileId: string, filters: ListAppointmentsFilters = {}): Promise<AppointmentRow[]> {
    const query = this.appointmentListQuery().where('appointment.specialistProfileId = :specialistProfileId', {
      specialistProfileId,
    });
    this.applyListFilters(query, filters);
    return query.getMany();
  }

  async updateStatus(
    manager: EntityManager,
    id: string,
    fields: { status: string; respondedAt?: Date | null; completedAt?: Date | null },
  ): Promise<AppointmentRow> {
    const patch: Partial<AppointmentRow> = { status: fields.status, updatedAt: new Date() };
    if (fields.respondedAt) patch.respondedAt = fields.respondedAt;
    if (fields.completedAt) patch.completedAt = fields.completedAt;

    const repository = manager.getRepository(AppointmentEntity);
    await repository.update({ id }, patch);
    return (await repository.findOne({ where: { id } }))!;
  }

  async updateSchedule(
    manager: EntityManager,
    id: string,
    fields: { specialistProfileId: string; requestedStartAt: Date; startAt: Date; endAt: Date },
  ): Promise<AppointmentRow> {
    const repository = manager.getRepository(AppointmentEntity);
    await repository.update(
      { id },
      {
        specialistProfileId: fields.specialistProfileId,
        requestedStartAt: fields.requestedStartAt,
        startAt: fields.startAt,
        endAt: fields.endAt,
        updatedAt: new Date(),
      },
    );
    return (await repository.findOne({ where: { id } }))!;
  }

  async recordStatusChange(
    manager: EntityManager,
    input: {
      appointmentId: string;
      fromStatus: string | null;
      toStatus: string;
      changedByUserId: string | null;
      reason?: string | null;
    },
  ): Promise<void> {
    const repository = manager.getRepository(AppointmentStatusHistoryEntity);
    await repository.save(repository.create({ ...input, reason: input.reason ?? null }));
  }

  async listStatusHistory(appointmentId: string): Promise<StatusHistoryRow[]> {
    return this.dataSource.getRepository(AppointmentStatusHistoryEntity).find({
      where: { appointmentId },
      order: { createdAt: 'ASC' },
    });
  }

  async withTransaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  private appointmentListQuery() {
    return this.dataSource
      .getRepository(AppointmentEntity)
      .createQueryBuilder('appointment')
      .orderBy('appointment.startAt', 'DESC')
      .addOrderBy('appointment.createdAt', 'DESC');
  }

  private applyListFilters(
    query: ReturnType<AppointmentRepository['appointmentListQuery']>,
    filters: ListAppointmentsFilters,
  ): void {
    if (filters.from) query.andWhere('appointment.endAt > :from', { from: filters.from });
    if (filters.to) query.andWhere('appointment.startAt < :to', { to: filters.to });
    if (filters.status) query.andWhere('appointment.status = :status', { status: filters.status });
    if (filters.serviceId) query.andWhere('appointment.serviceId = :serviceId', { serviceId: filters.serviceId });
    if (filters.specialistProfileId) {
      query.andWhere('appointment.specialistProfileId = :specialistProfileId', {
        specialistProfileId: filters.specialistProfileId,
      });
    }
    if (filters.limit) query.take(filters.limit);
  }
}
