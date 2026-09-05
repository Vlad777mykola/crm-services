import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import type { ListAppointmentsQueryInput } from '../../../modules/appointments/appointments.schemas.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { enrichAppointments, toFilters } from '../shared/appointment-query-utils.js';

export class ListClientAppointmentsHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(clientUserId: string, input: ListAppointmentsQueryInput = {}): Promise<AppointmentResponse[]> {
    const rows = await this.appointments.listByClient(clientUserId, toFilters(input));
    return enrichAppointments(this.projections, rows.map(toAppointmentResponse));
  }
}
