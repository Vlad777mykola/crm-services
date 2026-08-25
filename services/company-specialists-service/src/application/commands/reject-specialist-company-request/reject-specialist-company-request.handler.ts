import type { DataSource } from 'typeorm';

import type { CompanySpecialistRequestRow } from '../../../db/company-specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type {
  CompanySpecialistReadRepository,
  CompanySpecialistWriteRepository,
} from '../../ports/company-specialist-repositories.js';
import type { SpecialistProfileLookup } from '../../ports/specialist-profile-lookup.js';
import { getMySpecialistProfileOrThrow } from '../../services/company-specialist-guards.js';
import type { RejectSpecialistCompanyRequestCommand } from './reject-specialist-company-request.command.js';

export class RejectSpecialistCompanyRequestHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly specialistProfiles: SpecialistProfileLookup,
    private readonly reads: CompanySpecialistReadRepository,
    private readonly writes: CompanySpecialistWriteRepository,
  ) {}

  async execute(command: RejectSpecialistCompanyRequestCommand): Promise<CompanySpecialistRequestRow> {
    const profile = await getMySpecialistProfileOrThrow(this.specialistProfiles, command.userId);
    const request = await this.getPendingRequestForSpecialistOrThrow(command.requestId, profile.id);

    await this.dataSource.transaction(async (manager) => {
      await this.writes.markRequestResponded(manager, command.requestId, 'rejected');
    });

    return { ...request, status: 'rejected', respondedAt: new Date() };
  }

  private async getPendingRequestForSpecialistOrThrow(
    requestId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow> {
    const request = await this.reads.findPendingRequestForSpecialist(requestId, specialistProfileId);
    if (!request) {
      throw new AppError('Request not found', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError('This request has already been responded to', 409);
    }
    return request;
  }
}
