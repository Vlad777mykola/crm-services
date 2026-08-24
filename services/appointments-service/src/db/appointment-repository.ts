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
  notes: string | null;
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

  async listByCompany(companyId: string): Promise<AppointmentRow[]> {
    return this.dataSource.getRepository(AppointmentEntity).find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async listByClient(clientUserId: string): Promise<AppointmentRow[]> {
    return this.dataSource.getRepository(AppointmentEntity).find({
      where: { clientUserId },
      order: { createdAt: 'DESC' },
    });
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
}
