import type { DataSource } from 'typeorm';

import { ServiceRepository, type ServiceSpecialistRow } from '../../../db/service-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireOwnerOrManager } from '../../services/service-catalog-authorization.js';
import { TypeOrmServicesEventOutbox } from '../../services/typeorm-services-event-outbox.js';
import type { UnassignServiceSpecialistCommand } from './unassign-service-specialist.command.js';

export class UnassignServiceSpecialistHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
    private readonly outbox: TypeOrmServicesEventOutbox,
  ) {}

  async execute(command: UnassignServiceSpecialistCommand): Promise<ServiceSpecialistRow> {
    const service = await this.repo.findById(command.serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    await requireOwnerOrManager(this.dataSource, service.companyId, command.requesterUserId);

    const assignment = await this.repo.findAssignment(command.serviceId, command.specialistProfileId);
    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.repo.removeAssignment(manager, command.serviceId, command.specialistProfileId);

      await this.outbox.record(manager, {
        type: 'specialist-service.removed',
        aggregateId: assignment.id,
        correlationId: command.correlationId ?? null,
        payload: {
          serviceId: command.serviceId,
          companyId: service.companyId,
          specialistProfileId: command.specialistProfileId,
        },
      });
    });
    return assignment;
  }
}
