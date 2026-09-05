import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { assertTransitionAllowed } from '../../../modules/appointments/status-transitions.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import type { CancelAppointmentCommand } from './cancel-appointment.command.js';

export class CancelAppointmentHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
  ) {}

  async execute(command: CancelAppointmentCommand): Promise<AppointmentResponse> {
    const { appointmentId, clientUserId, correlationId } = command;

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
}
