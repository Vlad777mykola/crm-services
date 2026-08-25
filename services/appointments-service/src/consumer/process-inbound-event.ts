import type { DataSource } from 'typeorm';

import { RecordProjectionEventHandler } from '../application/event-handlers/record-projection-event/record-projection-event.handler.js';
import type { AppointmentRecommendationRepository } from '../db/appointment-recommendation-repository.js';
import type { ProjectionsRepository } from '../db/projections-repository.js';
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
  projections: ProjectionsRepository;
  recommendations: AppointmentRecommendationRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[appointments-service] already processed - skipping');
      return;
    }

    const handled = await new RecordProjectionEventHandler(deps.projections, deps.recommendations).handle(
      manager,
      envelope.type,
      envelope.data,
    );
    if (!handled) {
      logger.info({ type: envelope.type }, '[appointments-service] no handler for this event type - ignoring');
    }
  });
}
