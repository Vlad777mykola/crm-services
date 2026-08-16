import type { Pool } from 'pg';

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
  pool: Pool;
  processedEvents: ProcessedEventsRepository;
  projection: MembershipProjectionRepository;
}

export async function processInboundEvent(deps: ProcessInboundEventDeps, envelope: InboundEnvelope): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[auth-service] already processed - skipping');
      return;
    }

    if (envelope.type === 'company-member.added') {
      await handleCompanyMemberAdded(client, envelope.data as unknown as CompanyMemberAddedData, deps.projection);
    } else if (envelope.type === 'company-member.removed') {
      await handleCompanyMemberRemoved(client, envelope.data as unknown as CompanyMemberRemovedData, deps.projection);
    } else {
      logger.info({ type: envelope.type }, '[auth-service] no handler for this event type - ignoring');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
