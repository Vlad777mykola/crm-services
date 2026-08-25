import type { DataSource } from 'typeorm';

import { CompanyRepository } from '../../../db/company-repository.js';
import type { CompanyRow } from '../../../db/entities/company.entity.js';
import { AppError } from '../../../errors/AppError.js';
import { requireOwnerOrManager } from '../../services/company-authorization.js';
import { TypeOrmCompanyEventOutbox } from '../../services/typeorm-company-event-outbox.js';
import type { UpdateCompanyCommand } from './update-company.command.js';

const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export class UpdateCompanyHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly companies: CompanyRepository,
    private readonly outbox: TypeOrmCompanyEventOutbox,
  ) {}

  async execute(command: UpdateCompanyCommand): Promise<CompanyRow> {
    await requireOwnerOrManager(this.dataSource, command.companyId, command.requesterUserId);

    return this.dataSource.transaction(async (manager) => {
      const existing = await this.companies.findByIdWithManager(manager, command.companyId);
      if (!existing) {
        throw new AppError('Company not found', 404);
      }

      const fromStatus = existing.status;
      if (command.patch.status && command.patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(command.patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This company has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${command.patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.companies.update(manager, command.companyId, command.patch);

      if (updated.status !== fromStatus) {
        await this.companies.insertStatusHistory(manager, {
          companyId: command.companyId,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: command.requesterUserId,
        });
      }

      await this.outbox.record(manager, {
        type: 'company.updated',
        aggregateId: command.companyId,
        correlationId: command.correlationId ?? null,
        payload: { companyId: command.companyId, name: updated.name, status: updated.status },
      });

      return updated;
    });
  }
}
