import type { DataSource } from 'typeorm';

import { CreateServiceHandler } from '../../application/commands/create-service/create-service.handler.js';
import { UpdateServiceHandler } from '../../application/commands/update-service/update-service.handler.js';
import { ServiceQueries } from '../../application/queries/service-queries.js';
import { TypeOrmServicesEventOutbox } from '../../application/services/typeorm-services-event-outbox.js';
import { ServiceRepository, type ServiceRow, type StatusHistoryRow } from '../../db/service-repository.js';
import type { PaginationMeta } from '../../common/pagination.js';
import type { CreateServiceRequestInput, PublicServicesQueryInput, UpdateServiceRequestInput } from './services.schemas.js';

export class ServicesService {
  readonly repo: ServiceRepository;
  private readonly createCommand: CreateServiceHandler;
  private readonly queries: ServiceQueries;
  private readonly updateCommand: UpdateServiceHandler;

  constructor(dataSource: DataSource) {
    this.repo = new ServiceRepository(dataSource);
    const outbox = new TypeOrmServicesEventOutbox();
    this.createCommand = new CreateServiceHandler(dataSource, this.repo, outbox);
    this.queries = new ServiceQueries(dataSource, this.repo);
    this.updateCommand = new UpdateServiceHandler(dataSource, this.repo, outbox);
  }

  async create(companyId: string, requesterUserId: string, input: CreateServiceRequestInput): Promise<ServiceRow> {
    return this.createCommand.execute({ companyId, requesterUserId, input });
  }

  async listByCompany(companyId: string, requesterUserId: string | undefined): Promise<ServiceRow[]> {
    return this.queries.listByCompany(companyId, requesterUserId);
  }

  async listPublic(query: PublicServicesQueryInput): Promise<{ items: ServiceRow[]; meta: PaginationMeta }> {
    return this.queries.listPublic(query);
  }

  async getById(serviceId: string, requesterUserId: string | undefined): Promise<ServiceRow> {
    return this.queries.getById(serviceId, requesterUserId);
  }

  async update(
    companyId: string,
    serviceId: string,
    requesterUserId: string,
    patch: UpdateServiceRequestInput,
  ): Promise<ServiceRow> {
    return this.updateCommand.execute({ companyId, serviceId, requesterUserId, patch });
  }

  async getStatusHistory(companyId: string, serviceId: string, requesterUserId: string): Promise<StatusHistoryRow[]> {
    return this.queries.getStatusHistory(companyId, serviceId, requesterUserId);
  }
}
