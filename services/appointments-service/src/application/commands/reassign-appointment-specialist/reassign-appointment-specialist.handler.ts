import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { AvailabilityService } from '../../../modules/availability/application/availability.service.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import type { ReassignAppointmentSpecialistCommand } from './reassign-appointment-specialist.command.js';

/** Changes only the specialist, keeping the existing time slot. See reschedule-appointment for a combined time+specialist change. */
export class ReassignAppointmentSpecialistHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
    private readonly availability: AvailabilityService,
  ) {}

  async execute(command: ReassignAppointmentSpecialistCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, specialistProfileId, correlationId } = command;
    await requireManagingRole(this.projections, companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    if (!['pending', 'approved'].includes(appointment.status)) {
      throw new AppError('Only pending or approved appointments can be reassigned', 409);
    }

    const fromSpecialistProfileId = appointment.specialistProfileId;
    if (fromSpecialistProfileId === specialistProfileId) {
      return toAppointmentResponse(appointment);
    }

    const [service, company] = await Promise.all([
      this.projections.findService(appointment.serviceId),
      this.projections.findCompany(companyId),
    ]);
    if (!service) {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(service.serviceId, specialistProfileId);
    if (!assigned) {
      throw new AppError('Specialist is not assigned to this service', 409);
    }

    await this.availability.assertSlotAvailable({
      companyId,
      serviceId: service.serviceId,
      specialistProfileId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      excludeAppointmentId: appointmentId,
    });

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateSpecialist(client, appointmentId, specialistProfileId);

      await this.outbox.record(client, {
        type: 'appointment.specialist_reassigned',
        aggregateId: appointmentId,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId,
          companyId,
          serviceId: service.serviceId,
          clientUserId: appointment.clientUserId,
          fromSpecialistProfileId: fromSpecialistProfileId ?? specialistProfileId,
          toSpecialistProfileId: specialistProfileId,
          companyName: company?.name ?? 'Unknown company',
          serviceName: service.name,
        },
      });

      return updated;
    });

    return toAppointmentResponse(saved);
  }
}
