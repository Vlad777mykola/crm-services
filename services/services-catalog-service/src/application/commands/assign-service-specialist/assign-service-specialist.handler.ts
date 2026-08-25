import type { DataSource } from 'typeorm';

import { isActiveCompanySpecialist } from '../../../db/legacy-company-specialists-bridge.js';
import { ServiceRepository, type ServiceSpecialistRow } from '../../../db/service-repository.js';
import { AppError } from '../../../errors/AppError.js';
import { requireOwnerOrManager } from '../../services/service-catalog-authorization.js';
import { TypeOrmServicesEventOutbox } from '../../services/typeorm-services-event-outbox.js';
import type { AssignServiceSpecialistCommand } from './assign-service-specialist.command.js';

export class AssignServiceSpecialistHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: ServiceRepository,
    private readonly outbox: TypeOrmServicesEventOutbox,
  ) {}

  async execute(command: AssignServiceSpecialistCommand): Promise<ServiceSpecialistRow> {
    const service = await this.repo.findById(command.serviceId);
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    await requireOwnerOrManager(this.dataSource, service.companyId, command.requesterUserId);

    const isActive = await isActiveCompanySpecialist(
      this.dataSource,
      service.companyId,
      command.input.specialistProfileId,
    );
    if (!isActive) {
      throw new AppError('Specialist is not active in this company', 409);
    }

    const existing = await this.repo.findAssignment(command.serviceId, command.input.specialistProfileId);
    if (existing) {
      throw new AppError('Specialist is already assigned to this service', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const assignment = await this.repo.insertAssignment(manager, {
        serviceId: command.serviceId,
        companyId: service.companyId,
        specialistProfileId: command.input.specialistProfileId,
      });

      await this.outbox.record(manager, {
        type: 'specialist-service.assigned',
        aggregateId: assignment.id,
        correlationId: command.correlationId ?? null,
        payload: {
          serviceId: command.serviceId,
          companyId: service.companyId,
          specialistProfileId: command.input.specialistProfileId,
        },
      });

      return assignment;
    });
  }
}
