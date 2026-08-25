import type { CompanySpecialistRow } from '../../../db/company-specialist-repository.js';
import type { CompanySpecialistReadRepository } from '../../ports/company-specialist-repositories.js';
import type { SpecialistProfileLookup } from '../../ports/specialist-profile-lookup.js';
import { getMySpecialistProfileOrThrow } from '../../services/company-specialist-guards.js';
import type { ListMySpecialistCompaniesQuery } from './list-my-specialist-companies.query.js';

export class ListMySpecialistCompaniesHandler {
  constructor(
    private readonly specialistProfiles: SpecialistProfileLookup,
    private readonly reads: CompanySpecialistReadRepository,
  ) {}

  async execute(query: ListMySpecialistCompaniesQuery): Promise<CompanySpecialistRow[]> {
    const profile = await getMySpecialistProfileOrThrow(this.specialistProfiles, query.userId);
    return this.reads.listActiveRelationsBySpecialist(profile.id);
  }
}
