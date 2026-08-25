import type { DataSource } from 'typeorm';

import { upsertReviewEligibilityProjection } from '../db/appointment-review-eligibility-projection-repository.js';
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
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[reviews-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'appointment.review_eligible') {
      const data = envelope.data as unknown as {
        appointmentId: string;
        companyId: string;
        serviceId: string;
        clientUserId: string;
        specialistProfileId: string | null;
        serviceName: string | null;
        completedAt: string;
      };
      await upsertReviewEligibilityProjection(manager, data);
      return;
    }

    logger.info({ type: envelope.type }, '[reviews-service] no handler for this event type - ignoring');
  });
}
