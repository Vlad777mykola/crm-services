import type { DataSource } from 'typeorm';

import { ServiceRepository, type ServiceRow } from '../../../db/service-repository.js';
import { requireOwnerOrManager } from '../../services/service-catalog-authorization.js';
import { TypeOrmServicesEventOutbox } from '../../services/typeorm-services-event-outbox.js';
import type { CreateServiceCommand } from './create-service.command.js';

export class CreateServiceHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
    private readonly outbox: TypeOrmServicesEventOutbox,
  ) {}

  async execute(command: CreateServiceCommand): Promise<ServiceRow> {
    await requireOwnerOrManager(this.dataSource, command.companyId, command.requesterUserId);

    return this.dataSource.transaction(async (manager) => {
      const service = await this.repo.insert(manager, {
        companyId: command.companyId,
        name: command.input.name,
        description: command.input.description ?? null,
        category: command.input.category ?? null,
        durationMinutes: command.input.durationMinutes,
        price: command.input.price ?? null,
      });

      await this.repo.insertStatusHistory(manager, {
        serviceId: service.id,
        fromStatus: null,
        toStatus: service.status,
        changedByUserId: command.requesterUserId,
      });

      await this.outbox.record(manager, {
        type: 'service.created',
        aggregateId: service.id,
        payload: { serviceId: service.id, companyId: command.companyId, name: service.name, status: service.status },
      });

      return service;
    });
  }
}
