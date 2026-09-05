import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { assertTransitionAllowed } from '../../../modules/appointments/status-transitions.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import type { RejectAppointmentCommand } from './reject-appointment.command.js';

export class RejectAppointmentHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
  ) {}

  async execute(command: RejectAppointmentCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, correlationId } = command;
    await requireManagingRole(this.projections, companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const fromStatus = appointment.status;
    assertTransitionAllowed(fromStatus, 'rejected', 'This appointment has already been responded to');

    const [company, service] = await Promise.all([
      this.projections.findCompany(companyId),
      this.projections.findService(appointment.serviceId),
    ]);

    const saved = await this.appointments.withTransaction(async (client) => {
      const updated = await this.appointments.updateStatus(client, appointmentId, {
        status: 'rejected',
        respondedAt: new Date(),
      });

      await this.appointments.recordStatusChange(client, {
        appointmentId,
        fromStatus,
        toStatus: 'rejected',
        changedByUserId: requesterUserId,
      });

      await this.outbox.record(client, {
        type: 'appointment.rejected',
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
}
