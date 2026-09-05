import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireManagingRole, requireSpecialistOwnerOrManagingRole } from '../../services/appointment-authorization.js';

/** Authorization gate for availability read/write endpoints - not a data query itself. */
export class ManageAppointmentAvailabilityHandler {
  constructor(private readonly projections: ProjectionsRepository) {}

  async ensureCanManageCompany(companyId: string, requesterUserId: string): Promise<void> {
    await requireManagingRole(this.projections, companyId, requesterUserId);
  }

  /**
   * Availability access rule: the specialist can manage their own schedule
   * at this company; a company manager/owner can manage it on their behalf.
   * Not manager-only - see appointment-authorization.ts. Also rejects a
   * companyId/specialistProfileId pair that was never an active relation (or
   * has since been removed) - fed by company-specialist.accepted/.removed.
   */
  async ensureCanManageSpecialistAvailability(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
  ): Promise<void> {
    await requireSpecialistOwnerOrManagingRole(this.projections, companyId, specialistProfileId, requesterUserId);

    const isActiveAtCompany = await this.projections.isSpecialistActiveAtCompany(companyId, specialistProfileId);
    if (!isActiveAtCompany) {
      throw new AppError('This specialist is not an active relation for this company', 404);
    }
  }
}
