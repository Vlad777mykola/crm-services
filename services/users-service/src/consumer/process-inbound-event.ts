import type { Pool } from 'pg';

import type { UserRepository } from '../db/user-repository.js';
import {
  handleAuthUserRegistered,
  type AuthUserRegisteredData,
} from '../handlers/auth-user-registered.js';
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
  users: UserRepository;
  /** Test hook: throw after processed_events insert to verify rollback. */
  afterMarkProcessed?: () => void | Promise<void>;
}

/**
 * Consumer inbox transaction: processed_events + handler work commit atomically.
 * ACK/NACK remain the RabbitMQ wrapper's responsibility.
 */
export async function processInboundEvent(
  deps: ProcessInboundEventDeps,
  envelope: InboundEnvelope,
): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[users-service] already processed - skipping');
      return;
    }

    await deps.afterMarkProcessed?.();

    if (envelope.type === 'auth.user_registered') {
      await handleAuthUserRegistered(client, envelope.data as unknown as AuthUserRegisteredData, deps.users);
      await client.query('COMMIT');
      return;
    }

    await client.query('COMMIT');
    logger.info({ type: envelope.type }, '[users-service] no handler for this event type - ignoring');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
