import type { DataSource } from 'typeorm';

import type { MembershipProjectionRepository } from '../db/membership-projection-repository.js';
import {
  handleCompanyMemberAdded,
  handleCompanyMemberRemoved,
  type CompanyMemberAddedData,
  type CompanyMemberRemovedData,
} from '../handlers/company-member-events.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { logger } from '../logger.js';

export interface InboundEnvelope {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ProcessInboundEventDeps {
  dataSource: DataSource;
  processedEvents: ProcessedEventsRepository;
  projection: MembershipProjectionRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[auth-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'company-member.added') {
      await handleCompanyMemberAdded(manager, envelope.data as unknown as CompanyMemberAddedData, deps.projection);
    } else if (envelope.type === 'company-member.removed') {
      await handleCompanyMemberRemoved(manager, envelope.data as unknown as CompanyMemberRemovedData, deps.projection);
    } else {
      logger.info({ type: envelope.type }, '[auth-service] no handler for this event type - ignoring');
    }
  });
}
