import type { DataSource } from 'typeorm';

import { buildPaginationMeta, resolvePagination, type PaginationMeta } from '../../common/pagination.js';
import { CompanyRepository } from '../../db/company-repository.js';
import type { CompanyRow } from '../../db/entities/company.entity.js';
import type { StatusHistoryRow } from '../../db/entities/company-status-history.entity.js';
import { AppError } from '../../errors/AppError.js';
import type { PublicCompaniesQueryInput } from '../../modules/companies/companies.schemas.js';
import { canSeePrivateCompany, listActiveCompanyIdsForUser, requireOwnerOrManager } from '../services/company-authorization.js';

export interface CompanyMembership {
  role: 'owner' | 'manager';
  company: CompanyRow;
}

export class CompanyQueries {
  constructor(
    private readonly dataSource: DataSource,
    private readonly companies: CompanyRepository,
  ) {}

  async getPublic(query: PublicCompaniesQueryInput): Promise<{ items: CompanyRow[]; meta: PaginationMeta }> {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const { items, total } = await this.companies.listPublic({
      q: query.q,
      category: query.category,
      city: query.city,
      skip,
      take,
    });
    return { items, meta: buildPaginationMeta(page, pageSize, total) };
  }

  async getMyCompanies(userId: string): Promise<CompanyMembership[]> {
    const memberships = await listActiveCompanyIdsForUser(this.dataSource, userId);
    if (memberships.length === 0) {
      return [];
    }

    const companies = await this.companies.findByIds(memberships.map((membership) => membership.companyId));
    const byId = new Map(companies.map((company) => [company.id, company]));

    return memberships
      .filter((membership) => byId.has(membership.companyId))
      .map((membership) => ({ role: membership.role, company: byId.get(membership.companyId)! }));
  }

  async getById(companyId: string, requesterUserId: string | undefined): Promise<CompanyRow> {
    const company = await this.companies.findById(companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.status === 'published') {
      return company;
    }

    if (!(await canSeePrivateCompany(this.dataSource, companyId, requesterUserId))) {
      throw new AppError('Company not found', 404);
    }
    return company;
  }

  async getStatusHistory(companyId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    await requireOwnerOrManager(this.dataSource, companyId, requesterUserId);
    return this.companies.listStatusHistory(companyId);
  }
}
