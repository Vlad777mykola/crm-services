import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { AvailabilityService } from '../../../modules/availability/application/availability.service.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { addMinutes } from '../shared/appointment-command-utils.js';
import type { ChangeAppointmentServiceCommand } from './change-appointment-service.command.js';

/**
 * Changes which service an appointment is for, keeping the same start time
 * and specialist. The specialist must already be assigned to the new
 * service, and the new duration (which may differ) must still fit the slot.
 */
export class ChangeAppointmentServiceHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
    private readonly availability: AvailabilityService,
  ) {}

  async execute(command: ChangeAppointmentServiceCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, serviceId, correlationId } = command;
    await requireManagingRole(this.projections, companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (!['pending', 'approved'].includes(appointment.status)) {
      throw new AppError('Only pending or approved appointments can change service', 409);
    }

    const fromServiceId = appointment.serviceId;
    if (fromServiceId === serviceId) {
      return toAppointmentResponse(appointment);
    }
    if (!appointment.specialistProfileId) {
      throw new AppError('This appointment has no specialist assigned yet', 409);
    }

    const [newService, company] = await Promise.all([
      this.projections.findService(serviceId),
      this.projections.findCompany(companyId),
    ]);
    if (!newService || newService.companyId !== companyId || newService.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(serviceId, appointment.specialistProfileId);
    if (!assigned) {
      throw new AppError('The current specialist is not assigned to this service', 409);
    }

    const endAt = addMinutes(appointment.startAt, newService.durationMinutes);
    await this.availability.assertSlotAvailable({
      companyId,
      serviceId,
      specialistProfileId: appointment.specialistProfileId,
      startAt: appointment.startAt,
      endAt,
      excludeAppointmentId: appointmentId,
    });

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateService(client, appointmentId, { serviceId, endAt });

      await this.outbox.record(client, {
        type: 'appointment.service_changed',
        aggregateId: appointmentId,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          clientUserId: appointment.clientUserId,
          specialistProfileId: appointment.specialistProfileId,
          fromServiceId,
          toServiceId: serviceId,
          companyName: company?.name ?? 'Unknown company',
          toServiceName: newService.name,
          startAt: updated.startAt.toISOString(),
          endAt: updated.endAt.toISOString(),
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }
}
