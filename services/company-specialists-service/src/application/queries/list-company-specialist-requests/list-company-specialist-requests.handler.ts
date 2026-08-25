import type { CompanySpecialistRequestRow } from '../../../db/company-specialist-repository.js';
import type { CompanySpecialistReadRepository } from '../../ports/company-specialist-repositories.js';
import type { CompanyRoleLookup } from '../../ports/company-role-lookup.js';
import { requireOwnerOrManager } from '../../services/company-specialist-guards.js';
import type { ListCompanySpecialistRequestsQuery } from './list-company-specialist-requests.query.js';

export class ListCompanySpecialistRequestsHandler {
  constructor(
    private readonly companyRoles: CompanyRoleLookup,
    private readonly reads: CompanySpecialistReadRepository,
  ) {}

  async execute(query: ListCompanySpecialistRequestsQuery): Promise<CompanySpecialistRequestRow[]> {
    await requireOwnerOrManager(this.companyRoles, query.companyId, query.requesterUserId);
    return this.reads.listByCompany(query.companyId);
  }
}
