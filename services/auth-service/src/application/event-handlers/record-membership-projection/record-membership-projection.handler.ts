import type { EntityManager } from 'typeorm';

import type { MembershipProjectionRepository } from '../../../db/membership-projection-repository.js';
import { logger } from '../../../logger.js';
import type { CompanyMemberAddedData, CompanyMemberRemovedData } from './membership-events.js';

export class RecordMembershipProjectionHandler {
  constructor(private readonly projection: MembershipProjectionRepository) {}

  async handle(manager: EntityManager, type: string, data: Record<string, unknown>): Promise<boolean> {
    if (type === 'company-member.added') {
      const event = data as unknown as CompanyMemberAddedData;
      await this.projection.upsert(manager, event.companyId, event.userId, event.role);
      logger.info({ companyId: event.companyId, userId: event.userId }, '[auth-service] membership projection upserted');
      return true;
    }

    if (type === 'company-member.removed') {
      const event = data as unknown as CompanyMemberRemovedData;
      await this.projection.remove(manager, event.companyId, event.userId);
      logger.info({ companyId: event.companyId, userId: event.userId }, '[auth-service] membership projection row removed');
      return true;
    }

    return false;
  }
}
