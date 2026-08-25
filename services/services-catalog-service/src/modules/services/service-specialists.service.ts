import type { DataSource } from 'typeorm';

import { AssignServiceSpecialistHandler } from '../../application/commands/assign-service-specialist/assign-service-specialist.handler.js';
import { UnassignServiceSpecialistHandler } from '../../application/commands/unassign-service-specialist/unassign-service-specialist.handler.js';
import { ServiceSpecialistQueries } from '../../application/queries/service-specialist-queries.js';
import { TypeOrmServicesEventOutbox } from '../../application/services/typeorm-services-event-outbox.js';
import { ServiceRepository, type ServiceSpecialistRow } from '../../db/service-repository.js';
import type { AssignServiceSpecialistInput } from './service-specialists.schemas.js';

export class ServiceSpecialistsService {
  private readonly assignCommand: AssignServiceSpecialistHandler;
  private readonly queries: ServiceSpecialistQueries;
  private readonly unassignCommand: UnassignServiceSpecialistHandler;

  constructor(dataSource: DataSource) {
    const repo = new ServiceRepository(dataSource);
    const outbox = new TypeOrmServicesEventOutbox();
    this.assignCommand = new AssignServiceSpecialistHandler(dataSource, repo, outbox);
    this.queries = new ServiceSpecialistQueries(dataSource, repo);
    this.unassignCommand = new UnassignServiceSpecialistHandler(dataSource, repo, outbox);
  }

  async assign(
    serviceId: string,
    requesterUserId: string,
    input: AssignServiceSpecialistInput,
  ): Promise<ServiceSpecialistRow> {
    return this.assignCommand.execute({ serviceId, requesterUserId, input });
  }

  async list(serviceId: string, requesterUserId: string | undefined): Promise<ServiceSpecialistRow[]> {
    return this.queries.list(serviceId, requesterUserId);
  }

  async unassign(serviceId: string, specialistProfileId: string, requesterUserId: string): Promise<ServiceSpecialistRow> {
    return this.unassignCommand.execute({ serviceId, specialistProfileId, requesterUserId });
  }

  async listMine(userId: string): Promise<ServiceSpecialistRow[]> {
    return this.queries.listMine(userId);
  }
}
