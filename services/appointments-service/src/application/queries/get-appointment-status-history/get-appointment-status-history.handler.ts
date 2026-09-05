import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';

export class GetAppointmentStatusHistoryHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(appointmentId: string, requesterUserId: string) {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.clientUserId !== requesterUserId) {
      await requireManagingRole(this.projections, appointment.companyId, requesterUserId);
    }

    return this.appointments.listStatusHistory(appointmentId);
  }
}
