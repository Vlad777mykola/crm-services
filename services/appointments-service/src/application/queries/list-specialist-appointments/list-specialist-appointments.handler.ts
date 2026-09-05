import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { ListAppointmentsQueryInput } from '../../../modules/appointments/appointments.schemas.js';
import { isSpecialistOwner, requireManagingRole } from '../../services/appointment-authorization.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { enrichAppointments, toFilters } from '../shared/appointment-query-utils.js';

/**
 * Access rule: the specialist themself (any company, no companyId needed),
 * OR a manager/owner of a specific company (companyId required, scoped to
 * that company only). Must never be manager-only - specialists need to see
 * their own schedule without being granted a company role.
 */
export class ListSpecialistAppointmentsHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
  ) {}

  async execute(
    specialistProfileId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput & { companyId?: string } = {},
  ): Promise<AppointmentResponse[]> {
    const isOwner = await isSpecialistOwner(this.projections, specialistProfileId, requesterUserId);

    if (!isOwner) {
      if (!input.companyId) {
        throw new AppError('companyId is required for specialist appointment queries', 400);
      }
      await requireManagingRole(this.projections, input.companyId, requesterUserId);
    }

    if (input.companyId) {
      const rows = await this.appointments.listByCompany(input.companyId, {
        ...toFilters(input),
        specialistProfileId,
      });
      return enrichAppointments(this.projections, rows.map(toAppointmentResponse));
    }

    const rows = await this.appointments.listBySpecialist(specialistProfileId, toFilters(input));
    return enrichAppointments(this.projections, rows.map(toAppointmentResponse));
  }
}
