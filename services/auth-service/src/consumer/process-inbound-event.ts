import type { DataSource } from 'typeorm';

import { RecordMembershipProjectionHandler } from '../application/event-handlers/record-membership-projection/record-membership-projection.handler.js';
import type { MembershipProjectionRepository } from '../db/membership-projection-repository.js';
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

    const handled = await new RecordMembershipProjectionHandler(deps.projection).handle(manager, envelope.type, envelope.data);
    if (!handled) {
      logger.info({ type: envelope.type }, '[auth-service] no handler for this event type - ignoring');
    }
  });
}
