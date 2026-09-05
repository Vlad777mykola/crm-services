import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { enrichAppointments } from '../shared/appointment-query-utils.js';

export class GetAppointmentDetailsHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.clientUserId !== requesterUserId) {
      await requireManagingRole(this.projections, appointment.companyId, requesterUserId);
    }

    const [enriched] = await enrichAppointments(this.projections, [toAppointmentResponse(appointment)]);
    return enriched;
  }
}
