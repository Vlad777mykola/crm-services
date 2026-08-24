import type { DataSource } from 'typeorm';

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
  dataSource: DataSource;
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
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[users-service] already processed - skipping');
      return;
    }

    await deps.afterMarkProcessed?.();

    if (envelope.type === 'auth.user_registered') {
      await handleAuthUserRegistered(manager, envelope.data as unknown as AuthUserRegisteredData, deps.users);
      return;
    }

    logger.info({ type: envelope.type }, '[users-service] no handler for this event type - ignoring');
  });
}
