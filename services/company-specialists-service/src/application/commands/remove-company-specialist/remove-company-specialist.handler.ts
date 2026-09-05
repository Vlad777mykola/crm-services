import type { DataSource } from 'typeorm';

import type { CompanySpecialistRow } from '../../../db/company-specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { CompanyRoleLookup } from '../../ports/company-role-lookup.js';
import type { CompanySpecialistEventOutbox } from '../../ports/company-specialist-event-outbox.js';
import type {
  CompanySpecialistReadRepository,
  CompanySpecialistWriteRepository,
} from '../../ports/company-specialist-repositories.js';
import { requireOwnerOrManager } from '../../services/company-specialist-guards.js';
import type { RemoveCompanySpecialistCommand } from './remove-company-specialist.command.js';

export class RemoveCompanySpecialistHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly companyRoles: CompanyRoleLookup,
    private readonly reads: CompanySpecialistReadRepository,
    private readonly writes: CompanySpecialistWriteRepository,
    private readonly outbox: CompanySpecialistEventOutbox,
  ) {}

  async execute(command: RemoveCompanySpecialistCommand): Promise<CompanySpecialistRow> {
    await requireOwnerOrManager(this.companyRoles, command.companyId, command.requesterUserId);

    const relation = await this.reads.findActiveRelation(command.companyId, command.specialistProfileId);
    if (!relation) {
      throw new AppError('This specialist is not an active relation for this company', 404);
    }

    return this.dataSource.transaction(async (manager) => {
      const updated = await this.writes.endRelation(manager, relation.id);
      await this.outbox.record(manager, {
        type: 'company-specialist.removed',
        aggregateId: updated.id,
        correlationId: command.correlationId ?? null,
        payload: { companyId: command.companyId, specialistProfileId: command.specialistProfileId },
      });
      return updated;
    });
  }
}
