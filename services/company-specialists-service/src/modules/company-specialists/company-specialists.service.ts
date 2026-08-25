import type { DataSource } from 'typeorm';

import { AcceptSpecialistCompanyRequestHandler } from '../../application/commands/accept-specialist-company-request/accept-specialist-company-request.handler.js';
import { RejectSpecialistCompanyRequestHandler } from '../../application/commands/reject-specialist-company-request/reject-specialist-company-request.handler.js';
import { SendSpecialistRequestHandler } from '../../application/commands/send-specialist-request/send-specialist-request.handler.js';
import { ListCompanySpecialistRequestsHandler } from '../../application/queries/list-company-specialist-requests/list-company-specialist-requests.handler.js';
import { ListCompanySpecialistsHandler } from '../../application/queries/list-company-specialists/list-company-specialists.handler.js';
import { ListMySpecialistCompaniesHandler } from '../../application/queries/list-my-specialist-companies/list-my-specialist-companies.handler.js';
import { ListMySpecialistCompanyRequestsHandler } from '../../application/queries/list-my-specialist-company-requests/list-my-specialist-company-requests.handler.js';
import { TypeOrmCompanyRoleLookup } from '../../application/services/typeorm-company-role-lookup.js';
import { TypeOrmCompanySpecialistEventOutbox } from '../../application/services/typeorm-company-specialist-event-outbox.js';
import { TypeOrmSpecialistProfileLookup } from '../../application/services/typeorm-specialist-profile-lookup.js';
import {
  CompanySpecialistRepository,
  type CompanySpecialistRequestRow,
  type CompanySpecialistRow,
} from '../../db/company-specialist-repository.js';
import type { SendSpecialistRequestInput } from './company-specialists.schemas.js';

export class CompanySpecialistsService {
  private readonly acceptRequestCommand: AcceptSpecialistCompanyRequestHandler;
  private readonly listCompanyRequestsQuery: ListCompanySpecialistRequestsHandler;
  private readonly listCompanySpecialistsQuery: ListCompanySpecialistsHandler;
  private readonly listMyCompaniesQuery: ListMySpecialistCompaniesHandler;
  private readonly listMyRequestsQuery: ListMySpecialistCompanyRequestsHandler;
  private readonly rejectRequestCommand: RejectSpecialistCompanyRequestHandler;
  private readonly sendRequestCommand: SendSpecialistRequestHandler;

  constructor(dataSource: DataSource) {
    const repo = new CompanySpecialistRepository(dataSource);
    const companyRoles = new TypeOrmCompanyRoleLookup(dataSource);
    const specialistProfiles = new TypeOrmSpecialistProfileLookup(dataSource);
    const outbox = new TypeOrmCompanySpecialistEventOutbox();

    this.acceptRequestCommand = new AcceptSpecialistCompanyRequestHandler(
      dataSource,
      specialistProfiles,
      repo,
      repo,
      outbox,
    );
    this.listCompanyRequestsQuery = new ListCompanySpecialistRequestsHandler(companyRoles, repo);
    this.listCompanySpecialistsQuery = new ListCompanySpecialistsHandler(repo);
    this.listMyCompaniesQuery = new ListMySpecialistCompaniesHandler(specialistProfiles, repo);
    this.listMyRequestsQuery = new ListMySpecialistCompanyRequestsHandler(specialistProfiles, repo);
    this.rejectRequestCommand = new RejectSpecialistCompanyRequestHandler(dataSource, specialistProfiles, repo, repo);
    this.sendRequestCommand = new SendSpecialistRequestHandler(companyRoles, specialistProfiles, repo, repo);
  }

  async sendSpecialistRequest(
    companyId: string,
    requesterUserId: string,
    input: SendSpecialistRequestInput,
  ): Promise<CompanySpecialistRequestRow> {
    return this.sendRequestCommand.execute({ companyId, requesterUserId, input });
  }

  async listCompanySpecialistRequests(companyId: string, requesterUserId: string): Promise<CompanySpecialistRequestRow[]> {
    return this.listCompanyRequestsQuery.execute({ companyId, requesterUserId });
  }

  async listCompanySpecialists(companyId: string): Promise<CompanySpecialistRow[]> {
    return this.listCompanySpecialistsQuery.execute({ companyId });
  }

  async listMySpecialistCompanyRequests(userId: string): Promise<CompanySpecialistRequestRow[]> {
    return this.listMyRequestsQuery.execute({ userId });
  }

  async listMySpecialistCompanies(userId: string): Promise<CompanySpecialistRow[]> {
    return this.listMyCompaniesQuery.execute({ userId });
  }

  async acceptSpecialistCompanyRequest(requestId: string, userId: string): Promise<CompanySpecialistRequestRow> {
    return this.acceptRequestCommand.execute({ requestId, userId });
  }

  async rejectSpecialistCompanyRequest(requestId: string, userId: string): Promise<CompanySpecialistRequestRow> {
    return this.rejectRequestCommand.execute({ requestId, userId });
  }
}
