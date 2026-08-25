import type { DataSource } from 'typeorm';

import { ServiceRepository, type ServiceRow } from '../../../db/service-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireOwnerOrManager } from '../../services/service-catalog-authorization.js';
import { TypeOrmServicesEventOutbox } from '../../services/typeorm-services-event-outbox.js';
import type { UpdateServiceCommand } from './update-service.command.js';

const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export class UpdateServiceHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
    private readonly outbox: TypeOrmServicesEventOutbox,
  ) {}

  async execute(command: UpdateServiceCommand): Promise<ServiceRow> {
    await requireOwnerOrManager(this.dataSource, command.companyId, command.requesterUserId);

    return this.dataSource.transaction(async (manager) => {
      const existing = await this.repo.findByIdAndCompany(command.serviceId, command.companyId);
      if (!existing) {
        throw new AppError('Service not found', 404);
      }

      const fromStatus = existing.status;
      if (command.patch.status && command.patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(command.patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This service has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${command.patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.repo.update(manager, command.serviceId, command.patch);

      if (updated.status !== fromStatus) {
        await this.repo.insertStatusHistory(manager, {
          serviceId: updated.id,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: command.requesterUserId,
        });
      }

      await this.outbox.record(manager, {
        type: 'service.updated',
        aggregateId: updated.id,
        payload: { serviceId: updated.id, companyId: command.companyId, name: updated.name, status: updated.status },
      });

      return updated;
    });
  }
}
