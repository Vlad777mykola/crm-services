import type { DataSource } from 'typeorm';

import { AppointmentRepository } from '../../db/appointment-repository.js';
import { findUserName } from '../../db/legacy-users-bridge.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';
import type { CreateAppointmentInput, RespondToAppointmentInput } from '../../modules/appointments/appointments.schemas.js';
import { assertTransitionAllowed } from '../../modules/appointments/status-transitions.js';
import { requireManagingRole } from '../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../view-models/appointment-response.js';

export class AppointmentCommands {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
  ) {}

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

    const clientName = (await findUserName(this.dataSource, clientUserId)) ?? 'Unknown client';

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

      await this.outbox.record(client, {
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

    return toAppointmentResponse(appointment);
  }

  async respond(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RespondToAppointmentInput,
  ): Promise<AppointmentResponse> {
    await requireManagingRole(this.projections, companyId, requesterUserId);

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

      await this.outbox.record(client, {
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

    return toAppointmentResponse(saved);
  }

  async complete(companyId: string, appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    await requireManagingRole(this.projections, companyId, requesterUserId);

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

      await this.outbox.record(client, {
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

    return toAppointmentResponse(saved);
  }

  async cancel(appointmentId: string, clientUserId: string): Promise<AppointmentResponse> {
    const appointment = await this.appointments.findByIdAndClient(appointmentId, clientUserId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    assertTransitionAllowed(fromStatus, 'cancelled', 'This appointment can no longer be cancelled');

    const service = await this.projections.findService(appointment.serviceId);
    const clientName = (await findUserName(this.dataSource, clientUserId)) ?? 'Unknown client';

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateStatus(client, appointmentId, { status: 'cancelled' });

      await this.appointments.recordStatusChange(client, {
        appointmentId,
        fromStatus,
        toStatus: 'cancelled',
        changedByUserId: clientUserId,
      });

      await this.outbox.record(client, {
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

    return toAppointmentResponse(saved);
  }
}
