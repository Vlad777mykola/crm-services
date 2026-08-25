import type { EntityManager } from 'typeorm';

import { logger } from '../../../logger.js';
import type { CompanyMemberEventOutbox } from '../../ports/company-member-event-outbox.js';
import type { MemberWriteRepository } from '../../ports/member-repositories.js';
import type { CompanyCreatedData } from './company-created.event.js';

export class CreateOwnerFromCompanyCreatedHandler {
  constructor(
    private readonly members: MemberWriteRepository,
    private readonly outbox: CompanyMemberEventOutbox,
  ) {}

  async handle(manager: EntityManager, data: CompanyCreatedData): Promise<void> {
    const row = await this.members.insertOwner(manager, data.companyId, data.createdByUserId);
    if (!row) {
      logger.info({ companyId: data.companyId }, '[company-members-service] owner row already exists - skipping');
      return;
    }

    await this.outbox.record(manager, {
      type: 'company-member.added',
      aggregateId: row.id,
      payload: { companyId: data.companyId, userId: data.createdByUserId, role: 'owner' },
    });
  }
}
