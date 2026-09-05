import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { assertTransitionAllowed } from '../../../modules/appointments/status-transitions.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import type { CompleteAppointmentCommand } from './complete-appointment.command.js';

export class CompleteAppointmentHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
  ) {}

  async execute(command: CompleteAppointmentCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, correlationId } = command;
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
}
