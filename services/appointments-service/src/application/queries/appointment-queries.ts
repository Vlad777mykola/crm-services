import { AppointmentRepository } from '../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';
import { requireManagingRole } from '../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../view-models/appointment-response.js';

export class AppointmentQueries {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async listForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    await requireManagingRole(this.projections, companyId, requesterUserId);
    const rows = await this.appointments.listByCompany(companyId);
    return rows.map(toAppointmentResponse);
  }

  async listForClient(clientUserId: string): Promise<AppointmentResponse[]> {
    const rows = await this.appointments.listByClient(clientUserId);
    return rows.map(toAppointmentResponse);
  }

  async getStatusHistory(appointmentId: string, requesterUserId: string) {
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
