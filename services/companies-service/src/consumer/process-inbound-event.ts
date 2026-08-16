import type { Pool } from 'pg';

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
  pool: Pool;
  processedEvents: ProcessedEventsRepository;
  insights: CompanyInsightRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[companies-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'ai.company_insight_created') {
      await handleAiCompanyInsightCreated(
        client,
        envelope.data as unknown as AiCompanyInsightCreatedData,
        deps.insights,
      );
    } else {
      logger.info({ type: envelope.type }, '[companies-service] no handler for this event type - ignoring');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
