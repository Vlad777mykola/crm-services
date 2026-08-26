import { AppointmentRepository } from '../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AppError } from '../../errors/AppError.js';
import type { ListAppointmentsQueryInput } from '../../modules/appointments/appointments.schemas.js';
import { requireManagingRole } from '../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../view-models/appointment-response.js';

function toFilters(input: ListAppointmentsQueryInput = {}) {
  return {
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(input.to) : undefined,
    status: input.status,
    serviceId: input.serviceId,
    specialistProfileId: input.specialistProfileId,
    limit: input.limit,
  };
}

export class AppointmentQueries {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async ensureCanManageCompany(companyId: string, requesterUserId: string): Promise<void> {
    await requireManagingRole(this.projections, companyId, requesterUserId);
  }

  async listForCompany(
    companyId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput = {},
  ): Promise<AppointmentResponse[]> {
    await requireManagingRole(this.projections, companyId, requesterUserId);
    const rows = await this.appointments.listByCompany(companyId, toFilters(input));
    return rows.map(toAppointmentResponse);
  }

  async listPendingForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    return this.listForCompany(companyId, requesterUserId, { status: 'pending' });
  }

  async listForClient(
    clientUserId: string,
    input: ListAppointmentsQueryInput = {},
  ): Promise<AppointmentResponse[]> {
    const rows = await this.appointments.listByClient(clientUserId, toFilters(input));
    return rows.map(toAppointmentResponse);
  }

  async listForSpecialist(
    specialistProfileId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput & { companyId?: string } = {},
  ): Promise<AppointmentResponse[]> {
    if (!input.companyId) {
      throw new AppError('companyId is required for specialist appointment queries', 400);
    }
    await requireManagingRole(this.projections, input.companyId, requesterUserId);
    const rows = await this.appointments.listByCompany(input.companyId, {
      ...toFilters(input),
      specialistProfileId,
    });
    return rows.map(toAppointmentResponse);
  }

  async getById(appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.clientUserId !== requesterUserId) {
      await requireManagingRole(this.projections, appointment.companyId, requesterUserId);
    }

    return toAppointmentResponse(appointment);
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
