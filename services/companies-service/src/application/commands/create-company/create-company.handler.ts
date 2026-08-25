import type { DataSource } from 'typeorm';

import { CompanyRepository } from '../../../db/company-repository.js';
import type { CompanyRow } from '../../../db/entities/company.entity.js';
import { TypeOrmCompanyEventOutbox } from '../../services/typeorm-company-event-outbox.js';
import type { CreateCompanyCommand } from './create-company.command.js';

export class CreateCompanyHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly companies: CompanyRepository,
    private readonly outbox: TypeOrmCompanyEventOutbox,
  ) {}

  execute(command: CreateCompanyCommand): Promise<CompanyRow> {
    return this.dataSource.transaction(async (manager) => {
      const slug = await this.companies.generateUniqueSlug(manager, command.input.name);
      const company = await this.companies.insert(manager, {
        name: command.input.name,
        slug,
        description: command.input.description ?? null,
        category: command.input.category ?? null,
        website: command.input.website ?? null,
        phone: command.input.phone ?? null,
        email: command.input.email ?? null,
        isRemoteSupported: command.input.isRemoteSupported ?? false,
        city: command.input.city ?? null,
        address: command.input.address ?? null,
        createdByUserId: command.creatorUserId,
      });

      await this.companies.insertStatusHistory(manager, {
        companyId: company.id,
        fromStatus: null,
        toStatus: company.status,
        changedByUserId: command.creatorUserId,
      });

      await this.outbox.record(manager, {
        type: 'company.created',
        aggregateId: company.id,
        payload: {
          companyId: company.id,
          name: company.name,
          slug: company.slug,
          createdByUserId: command.creatorUserId,
        },
      });

      return company;
    });
  }
}
