import type { DataSource } from 'typeorm';

import type { MemberRepository } from '../db/member-repository.js';
import { handleCompanyCreated, type CompanyCreatedData } from '../handlers/company-created.js';
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
  members: MemberRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[company-members-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'company.created') {
      await handleCompanyCreated(envelope.data as unknown as CompanyCreatedData, deps.members, manager);
      return;
    }

    logger.info({ type: envelope.type }, '[company-members-service] no handler for this event type - ignoring');
  });
}
