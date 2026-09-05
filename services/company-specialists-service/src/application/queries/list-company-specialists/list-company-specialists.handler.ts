import type { CompanySpecialistWithSpecialistRow } from '../../../db/company-specialist-repository.js';
import type { CompanySpecialistReadRepository } from '../../ports/company-specialist-repositories.js';
import type { ListCompanySpecialistsQuery } from './list-company-specialists.query.js';

export class ListCompanySpecialistsHandler {
  constructor(private readonly reads: CompanySpecialistReadRepository) {}

  execute(query: ListCompanySpecialistsQuery): Promise<CompanySpecialistWithSpecialistRow[]> {
    return this.reads.listActiveRelationsByCompanyWithSpecialist(query.companyId);
  }
}
