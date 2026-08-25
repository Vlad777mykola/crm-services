import type { DataSource } from 'typeorm';

import {
  CreateOwnerFromCompanyCreatedHandler,
} from '../application/event-handlers/create-owner-from-company-created/create-owner-from-company-created.handler.js';
import type {
  CompanyCreatedData,
} from '../application/event-handlers/create-owner-from-company-created/company-created.event.js';
import { TypeOrmCompanyMemberEventOutbox } from '../application/services/typeorm-company-member-event-outbox.js';
import type { MemberRepository } from '../db/member-repository.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { logger } from '../logger.js';

export interface InboundEnvelope {
  id: string;
  type: string;
  correlationId?: string | null;
  causationId?: string | null;
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
      await new CreateOwnerFromCompanyCreatedHandler(deps.members, new TypeOrmCompanyMemberEventOutbox()).handle(
        manager,
        envelope.data as unknown as CompanyCreatedData,
        { correlationId: envelope.correlationId ?? envelope.id, causationId: envelope.id },
      );
      return;
    }

    logger.info({ type: envelope.type }, '[company-members-service] no handler for this event type - ignoring');
  });
}
