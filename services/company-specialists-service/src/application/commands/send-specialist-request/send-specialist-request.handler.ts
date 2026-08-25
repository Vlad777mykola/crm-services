import type { CompanySpecialistRequestRow } from '../../../db/company-specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type {
  CompanySpecialistReadRepository,
  CompanySpecialistWriteRepository,
} from '../../ports/company-specialist-repositories.js';
import type { CompanyRoleLookup } from '../../ports/company-role-lookup.js';
import type { SpecialistProfileLookup } from '../../ports/specialist-profile-lookup.js';
import { requireOwnerOrManager } from '../../services/company-specialist-guards.js';
import type { SendSpecialistRequestCommand } from './send-specialist-request.command.js';

export class SendSpecialistRequestHandler {
  constructor(
    private readonly companyRoles: CompanyRoleLookup,
    private readonly specialistProfiles: SpecialistProfileLookup,
    private readonly reads: CompanySpecialistReadRepository,
    private readonly writes: CompanySpecialistWriteRepository,
  ) {}

  async execute(command: SendSpecialistRequestCommand): Promise<CompanySpecialistRequestRow> {
    await requireOwnerOrManager(this.companyRoles, command.companyId, command.requesterUserId);

    const specialist = await this.specialistProfiles.findById(command.input.specialistProfileId);
    if (!specialist) {
      throw new AppError('Specialist profile not found', 404);
    }

    const activeRelation = await this.reads.findActiveRelation(command.companyId, specialist.id);
    if (activeRelation) {
      throw new AppError('This specialist is already active in your company', 409);
    }

    const pendingRequest = await this.reads.findPendingRequest(command.companyId, specialist.id);
    if (pendingRequest) {
      throw new AppError('A pending request already exists for this specialist', 409);
    }

    return this.writes.insertRequest({
      companyId: command.companyId,
      specialistProfileId: specialist.id,
      requestedByUserId: command.requesterUserId,
      message: command.input.message ?? null,
    });
  }
}
