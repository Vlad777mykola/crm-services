import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import type { ListAppointmentsQueryInput } from '../../../modules/appointments/appointments.schemas.js';
import { requireManagingRole } from '../../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { enrichAppointments, toFilters } from '../shared/appointment-query-utils.js';

export class ListCompanyAppointmentsHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(
    companyId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput = {},
  ): Promise<AppointmentResponse[]> {
    await requireManagingRole(this.projections, companyId, requesterUserId);
    const rows = await this.appointments.listByCompany(companyId, toFilters(input));
    return enrichAppointments(this.projections, rows.map(toAppointmentResponse));
  }
}
