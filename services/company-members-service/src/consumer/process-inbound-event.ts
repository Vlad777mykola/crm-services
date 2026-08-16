import type { Pool } from 'pg';

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
  pool: Pool;
  processedEvents: ProcessedEventsRepository;
  members: MemberRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[company-members-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'company.created') {
      await handleCompanyCreated(envelope.data as unknown as CompanyCreatedData, deps.members, client);
      await client.query('COMMIT');
      return;
    }

    await client.query('COMMIT');
    logger.info({ type: envelope.type }, '[company-members-service] no handler for this event type - ignoring');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
