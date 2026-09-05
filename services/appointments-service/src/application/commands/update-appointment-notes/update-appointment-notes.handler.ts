import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import type { UpdateAppointmentNotesCommand } from './update-appointment-notes.command.js';

/** Internal notes only - no domain event, no status change. Local metadata edit. */
export class UpdateAppointmentNotesHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(command: UpdateAppointmentNotesCommand): Promise<AppointmentResponse> {
    const { companyId, appointmentId, requesterUserId, notes } = command;
    await requireManagingRole(this.projections, companyId, requesterUserId);

    const appointment = await this.appointments.findByIdAndCompany(appointmentId, companyId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const updated = await this.appointments.withTransaction((client) =>
      this.appointments.updateNotes(client, appointmentId, notes),
    );

    return toAppointmentResponse(updated);
  }
}
