import type { Pool } from 'pg';

import { AppointmentRepository, type AppointmentRow } from '../../db/appointment-repository.js';
import { findUserName } from '../../db/legacy-users-bridge.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import type { CreateAppointmentInput, RespondToAppointmentInput } from './appointments.schemas.js';
import { assertTransitionAllowed } from './status-transitions.js';

const MANAGING_ROLES = new Set(['owner', 'manager']);

export interface AppointmentResponse extends AppointmentRow {
  hasReview: boolean;
}

function toResponse(row: AppointmentRow): AppointmentResponse {
  // See README "Known gaps" - review.received doesn't carry appointmentId,
  // so this can't be event-fed today; always false until that's resolved.
  return { ...row, hasReview: false };
}

export class AppointmentsService {
  private readonly appointments: AppointmentRepository;
  private readonly projections: ProjectionsRepository;

  constructor(private readonly pool: Pool) {
    this.appointments = new AppointmentRepository(pool);
    this.projections = new ProjectionsRepository(pool);
  }

  private async requireManagingRole(companyId: string, userId: string): Promise<void> {
    const role = await this.projections.findMembershipRole(companyId, userId);
    if (!role || !MANAGING_ROLES.has(role)) {
      throw new AppError('You do not have permission to manage this company', 403);
    }
  }

  async create(companyId: string, clientUserId: string, input: CreateAppointmentInput): Promise<AppointmentResponse> {
    const service = await this.projections.findService(input.serviceId);
    if (!service || service.companyId !== companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    if (input.specialistProfileId) {
      const assigned = await this.projections.isServiceSpecialistAssigned(service.serviceId, input.specialistProfileId);
      if (!assigned) {
        throw new AppError('Preferred specialist is not assigned to this service', 409);
      }
    }

    const clientName = (await findUserName(this.pool, clientUserId)) ?? 'Unknown client';

    const appointment = await this.appointments.withTransaction(async (client) => {
      const created = await this.appointments.create(client, {
        companyId,
        serviceId: service.serviceId,
        specialistProfileId: input.specialistProfileId ?? null,
        clientUserId,
        requestedStartAt: new Date(input.requestedStartAt),
        notes: input.notes ?? null,
      });

      await this.appointments.recordStatusChange(client, {
        appointmentId: created.id,
        fromStatus: null,
        toStatus: 'pending',
        changedByUserId: clientUserId,
      });

      await recordOutboxEvent(client, {
        type: 'appointment.requested',
        aggregateId: created.id,
        payload: {
          appointmentId: created.id,
          companyId,
          serviceId: service.serviceId,
          serviceName: service.name,
          clientName,
          requestedStartAt: created.requestedStartAt.toISOString(),
        },
      });

      return created;
    });

    return toResponse(appointment);
  }

  async listForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    await this.requireManagingRole(companyId, requesterUserId);
    const rows = await this.appointments.listByCompany(companyId);
    return rows.map(toResponse);
  }

  async listForClient(clientUserId: string): Promise<AppointmentResponse[]> {
    const rows = await this.appointments.listByClient(clientUserId);
    return rows.map(toResponse);
  }

  async respond(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RespondToAppointmentInput,
  ): Promise<AppointmentResponse> {
    await this.requireManagingRole(companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    const nextStatus = input.status === 'approved' ? 'approved' : 'rejected';
    assertTransitionAllowed(fromStatus, nextStatus, 'This appointment has already been responded to');

    const [company, service] = await Promise.all([
      this.projections.findCompany(companyId),
      this.projections.findService(appointment.serviceId),
    ]);

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateStatus(client, appointmentId, {
        status: nextStatus,
        respondedAt: new Date(),
      });

      await this.appointments.recordStatusChange(client, {
        appointmentId,
        fromStatus,
        toStatus: nextStatus,
        changedByUserId: requesterUserId,
      });

      await recordOutboxEvent(client, {
        type: nextStatus === 'approved' ? 'appointment.approved' : 'appointment.rejected',
        aggregateId: appointmentId,
        payload: {
          appointmentId,
          companyId,
          serviceId: appointment.serviceId,
          clientUserId: appointment.clientUserId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service?.name ?? 'Unknown service',
          requestedStartAt: updated.requestedStartAt.toISOString(),
        },
      });

      return updated;
    });

    return toResponse(saved);
  }

  async complete(companyId: string, appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    await this.requireManagingRole(companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    assertTransitionAllowed(fromStatus, 'completed', 'Only approved appointments can be marked as completed');

    const [company, service] = await Promise.all([
      this.projections.findCompany(companyId),
      this.projections.findService(appointment.serviceId),
    ]);

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateStatus(client, appointmentId, {
        status: 'completed',
        completedAt: new Date(),
      });

      await this.appointments.recordStatusChange(client, {
        appointmentId,
        fromStatus,
        toStatus: 'completed',
        changedByUserId: requesterUserId,
      });

      await recordOutboxEvent(client, {
        type: 'appointment.completed',
        aggregateId: appointmentId,
        payload: {
          appointmentId,
          companyId,
          serviceId: appointment.serviceId,
          clientUserId: appointment.clientUserId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service?.name ?? 'Unknown service',
        },
      });

      return updated;
    });

    return toResponse(saved);
  }

  async getStatusHistory(appointmentId: string, requesterUserId: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.clientUserId !== requesterUserId) {
      await this.requireManagingRole(appointment.companyId, requesterUserId);
    }

    return this.appointments.listStatusHistory(appointmentId);
  }

  async cancel(appointmentId: string, clientUserId: string): Promise<AppointmentResponse> {
    const appointment = await this.appointments.findByIdAndClient(appointmentId, clientUserId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    assertTransitionAllowed(fromStatus, 'cancelled', 'This appointment can no longer be cancelled');

    const service = await this.projections.findService(appointment.serviceId);
    const clientName = (await findUserName(this.pool, clientUserId)) ?? 'Unknown client';

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateStatus(client, appointmentId, { status: 'cancelled' });

      await this.appointments.recordStatusChange(client, {
        appointmentId,
        fromStatus,
        toStatus: 'cancelled',
        changedByUserId: clientUserId,
      });

      await recordOutboxEvent(client, {
        type: 'appointment.cancelled',
        aggregateId: appointmentId,
        payload: {
          appointmentId,
          companyId: appointment.companyId,
          serviceId: appointment.serviceId,
          serviceName: service?.name ?? 'Unknown service',
          clientName,
          requestedStartAt: updated.requestedStartAt.toISOString(),
        },
      });

      return updated;
    });

    return toResponse(saved);
  }
}
