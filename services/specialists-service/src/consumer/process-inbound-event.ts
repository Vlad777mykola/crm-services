import type { DataSource } from 'typeorm';

import { RecordPublicSpecialistProjectionHandler } from '../application/event-handlers/record-public-specialist-projection/record-public-specialist-projection.handler.js';
import type { PublicSpecialistProjectionRepository } from '../db/public-specialist-projection-repository.js';
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
  projections: PublicSpecialistProjectionRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[specialists-service] already processed - skipping');
      return;
    }

    const handled = await new RecordPublicSpecialistProjectionHandler(deps.projections).handle(
      manager,
      envelope.type,
      envelope.data,
    );
    if (!handled) {
      logger.info({ type: envelope.type }, '[specialists-service] no handler for this event type - ignoring');
    }
  });
}
