import type { DataSource } from 'typeorm';

import type { CompanyInsightRepository } from '../db/company-insight-repository.js';
import {
  handleAiCompanyInsightCreated,
  type AiCompanyInsightCreatedData,
} from '../handlers/ai-company-insight-created.js';
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
  insights: CompanyInsightRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[companies-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'ai.company_insight_created') {
      await handleAiCompanyInsightCreated(
        manager,
        envelope.data as unknown as AiCompanyInsightCreatedData,
        deps.insights,
      );
    } else {
      logger.info({ type: envelope.type }, '[companies-service] no handler for this event type - ignoring');
    }
  });
}
