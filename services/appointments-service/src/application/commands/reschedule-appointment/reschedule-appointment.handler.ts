import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { AvailabilityService } from '../../../modules/availability/application/availability.service.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { addMinutes, isAppointmentOverlapError } from '../shared/appointment-command-utils.js';
import type { RescheduleAppointmentCommand } from './reschedule-appointment.command.js';

/**
 * Changes the time (and, historically, optionally the specialist in the same
 * call). `reassign-appointment-specialist` now exists as a dedicated,
 * specialist-only command - prefer it for pure reassignment. This handler
 * keeps the combined behavior for backward compatibility with existing
 * callers that pass `specialistProfileId` alongside a new `startAt`.
 */
export class RescheduleAppointmentHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
    private readonly availability: AvailabilityService,
  ) {}

  async execute(command: RescheduleAppointmentCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, input, correlationId } = command;
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
}
