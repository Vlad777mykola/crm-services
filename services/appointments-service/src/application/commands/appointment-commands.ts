import { AppointmentRepository } from '../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';
import type {
  CreateAppointmentInput,
  RespondToAppointmentInput,
  RescheduleAppointmentInput,
} from '../../modules/appointments/appointments.schemas.js';
import { AvailabilityService } from '../../modules/availability/application/availability.service.js';
import { assertTransitionAllowed } from '../../modules/appointments/status-transitions.js';
import { requireManagingRole } from '../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../view-models/appointment-response.js';

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function isAppointmentOverlapError(err: unknown): boolean {
  const candidate = err as { code?: unknown; constraint?: unknown };
  return candidate.code === '23P01' || candidate.constraint === 'appointments_no_specialist_overlap';
}

export class AppointmentCommands {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
    private readonly availability: AvailabilityService,
  ) {}

  async create(
    companyId: string,
    clientUserId: string,
    input: CreateAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    const service = await this.projections.findService(input.serviceId);
    if (!service || service.companyId !== companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(service.serviceId, input.specialistProfileId);
    if (!assigned) {
      throw new AppError('Preferred specialist is not assigned to this service', 409);
    }

    const clientName = (await this.projections.findClientProfile(clientUserId))?.name ?? 'Unknown client';
    const startAt =
      input.mode === 'next_available'
        ? await this.resolveNextAvailableStartAt(companyId, service.serviceId, input.specialistProfileId, input)
        : new Date(input.requestedStartAt!);
    const endAt = addMinutes(startAt, service.durationMinutes);

    await this.availability.assertSlotAvailable({
      companyId,
      serviceId: service.serviceId,
      specialistProfileId: input.specialistProfileId,
      startAt,
      endAt,
    });

    const appointment = await this.appointments.withTransaction(async (client) => {
      let created;
      try {
        created = await this.appointments.create(client, {
          companyId,
          serviceId: service.serviceId,
          specialistProfileId: input.specialistProfileId,
          clientUserId,
          requestedStartAt: startAt,
          startAt,
          endAt,
          createdByUserId: clientUserId,
          notes: input.notes ?? null,
        });
      } catch (err) {
        if (isAppointmentOverlapError(err)) {
          throw new AppError('Selected slot is not available', 409);
        }
        throw err;
      }

      await this.appointments.recordStatusChange(client, {
        appointmentId: created.id,
        fromStatus: null,
        toStatus: 'pending',
        changedByUserId: clientUserId,
      });

      await this.outbox.record(client, {
        type: 'appointment.requested',
        aggregateId: created.id,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId: created.id,
          companyId,
          serviceId: service.serviceId,
          serviceName: service.name,
          clientName,
          requestedStartAt: created.requestedStartAt.toISOString(),
          startAt: created.startAt.toISOString(),
          endAt: created.endAt.toISOString(),
        },
      });

      return created;
    });

    return toAppointmentResponse(appointment);
  }

  async reschedule(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RescheduleAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    await requireManagingRole(this.projections, companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (!['pending', 'approved'].includes(appointment.status)) {
      throw new AppError('Only pending or approved appointments can be rescheduled', 409);
    }

    const service = await this.projections.findService(appointment.serviceId);
    if (!service || service.companyId !== companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const specialistProfileId = input.specialistProfileId ?? appointment.specialistProfileId;
    if (!specialistProfileId) {
      throw new AppError('A specialist is required to reschedule this appointment', 409);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(service.serviceId, specialistProfileId);
    if (!assigned) {
      throw new AppError('Specialist is not assigned to this service', 409);
    }
    const company = await this.projections.findCompany(companyId);

    const startAt = new Date(input.startAt);
    const endAt = addMinutes(startAt, service.durationMinutes);
    await this.availability.assertSlotAvailable({
      companyId,
      serviceId: service.serviceId,
      specialistProfileId,
      startAt,
      endAt,
      excludeAppointmentId: appointmentId,
    });

    const saved = await this.appointments.withTransaction(async (client) => {
      let updated;
      try {
        updated = await this.appointments.updateSchedule(client, appointmentId, {
          specialistProfileId,
          requestedStartAt: startAt,
          startAt,
          endAt,
        });
      } catch (err) {
        if (isAppointmentOverlapError(err)) {
          throw new AppError('Selected slot is not available', 409);
        }
        throw err;
      }

      await this.outbox.record(client, {
        type: 'appointment.rescheduled',
        aggregateId: appointmentId,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          serviceId: service.serviceId,
          clientUserId: appointment.clientUserId,
          specialistProfileId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service.name,
          previousStartAt: appointment.startAt.toISOString(),
          previousEndAt: appointment.endAt.toISOString(),
          requestedStartAt: updated.requestedStartAt.toISOString(),
          startAt: updated.startAt.toISOString(),
          endAt: updated.endAt.toISOString(),
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }

  async respond(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RespondToAppointmentInput,
    correlationId?: string,
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
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          serviceId: appointment.serviceId,
          clientUserId: appointment.clientUserId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service?.name ?? 'Unknown service',
          requestedStartAt: updated.requestedStartAt.toISOString(),
          startAt: updated.startAt.toISOString(),
          endAt: updated.endAt.toISOString(),
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }

  async complete(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
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
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          serviceId: appointment.serviceId,
          clientUserId: appointment.clientUserId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service?.name ?? 'Unknown service',
        },
      });

      await this.outbox.record(client, {
        type: 'appointment.review_eligible',
        aggregateId: appointmentId,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          serviceId: appointment.serviceId,
          clientUserId: appointment.clientUserId,
          specialistProfileId: appointment.specialistProfileId,
          serviceName: service?.name ?? 'Unknown service',
          completedAt: updated.completedAt?.toISOString() ?? new Date().toISOString(),
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }

  async cancel(appointmentId: string, clientUserId: string, correlationId?: string): Promise<AppointmentResponse> {
    const appointment = await this.appointments.findByIdAndClient(appointmentId, clientUserId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    assertTransitionAllowed(fromStatus, 'cancelled', 'This appointment can no longer be cancelled');

    const service = await this.projections.findService(appointment.serviceId);
    const clientName = (await this.projections.findClientProfile(clientUserId))?.name ?? 'Unknown client';

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
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId: appointment.companyId,
          serviceId: appointment.serviceId,
          serviceName: service?.name ?? 'Unknown service',
          clientName,
          requestedStartAt: updated.requestedStartAt.toISOString(),
          startAt: updated.startAt.toISOString(),
          endAt: updated.endAt.toISOString(),
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }

  private async resolveNextAvailableStartAt(
    companyId: string,
    serviceId: string,
    specialistProfileId: string,
    input: CreateAppointmentInput,
  ): Promise<Date> {
    if (!input.windowFrom || !input.windowTo) {
      throw new AppError('windowFrom and windowTo are required for next available booking', 400);
    }

    const slot = await this.availability.findBestAvailableSlot({
      companyId,
      serviceId,
      specialistProfileId,
      from: new Date(input.windowFrom),
      to: new Date(input.windowTo),
      limit: 1,
    });
    if (!slot) {
      throw new AppError('No available slot in selected time', 409);
    }
    return new Date(slot.startAt);
  }
}
