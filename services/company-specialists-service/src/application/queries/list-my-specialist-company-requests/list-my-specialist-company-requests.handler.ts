import type { CompanySpecialistRequestRow } from '../../../db/company-specialist-repository.js';
import type { CompanySpecialistReadRepository } from '../../ports/company-specialist-repositories.js';
import type { SpecialistProfileLookup } from '../../ports/specialist-profile-lookup.js';
import { getMySpecialistProfileOrThrow } from '../../services/company-specialist-guards.js';
import type { ListMySpecialistCompanyRequestsQuery } from './list-my-specialist-company-requests.query.js';

export class ListMySpecialistCompanyRequestsHandler {
  constructor(
    private readonly specialistProfiles: SpecialistProfileLookup,
    private readonly reads: CompanySpecialistReadRepository,
  ) {}

  async execute(query: ListMySpecialistCompanyRequestsQuery): Promise<CompanySpecialistRequestRow[]> {
    const profile = await getMySpecialistProfileOrThrow(this.specialistProfiles, query.userId);
    return this.reads.listBySpecialist(profile.id);
  }
}
