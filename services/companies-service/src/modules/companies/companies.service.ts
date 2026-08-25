import type { DataSource } from 'typeorm';

import { CreateCompanyHandler } from '../../application/commands/create-company/create-company.handler.js';
import { UpdateCompanyHandler } from '../../application/commands/update-company/update-company.handler.js';
import { CompanyQueries, type CompanyMembership } from '../../application/queries/company-queries.js';
import { TypeOrmCompanyEventOutbox } from '../../application/services/typeorm-company-event-outbox.js';
import { CompanyRepository } from '../../db/company-repository.js';
import type { CompanyRow } from '../../db/entities/company.entity.js';
import type { StatusHistoryRow } from '../../db/entities/company-status-history.entity.js';
import type { PaginationMeta } from '../../common/pagination.js';
import type { CreateCompanyRequestInput, PublicCompaniesQueryInput, UpdateCompanyRequestInput } from './companies.schemas.js';

export type { CompanyMembership } from '../../application/queries/company-queries.js';

export class CompaniesService {
  private readonly createCommand: CreateCompanyHandler;
  private readonly queries: CompanyQueries;
  private readonly updateCommand: UpdateCompanyHandler;

  constructor(dataSource: DataSource) {
    const companies = new CompanyRepository(dataSource);
    const outbox = new TypeOrmCompanyEventOutbox();
    this.createCommand = new CreateCompanyHandler(dataSource, companies, outbox);
    this.queries = new CompanyQueries(dataSource, companies);
    this.updateCommand = new UpdateCompanyHandler(dataSource, companies, outbox);
  }

  async create(input: CreateCompanyRequestInput, creatorUserId: string): Promise<CompanyRow> {
    return this.createCommand.execute({ input, creatorUserId });
  }

  async getPublic(
    query: PublicCompaniesQueryInput,
  ): Promise<{ items: CompanyRow[]; meta: PaginationMeta }> {
    return this.queries.getPublic(query);
  }

  async getMyCompanies(userId: string): Promise<CompanyMembership[]> {
    return this.queries.getMyCompanies(userId);
  }

  async getById(companyId: string, requesterUserId: string | undefined): Promise<CompanyRow> {
    return this.queries.getById(companyId, requesterUserId);
  }

  async update(companyId: string, requesterUserId: string, patch: UpdateCompanyRequestInput): Promise<CompanyRow> {
    return this.updateCommand.execute({ companyId, requesterUserId, patch });
  }

  async getStatusHistory(companyId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    return this.queries.getStatusHistory(companyId, requesterUserId);
  }
}
