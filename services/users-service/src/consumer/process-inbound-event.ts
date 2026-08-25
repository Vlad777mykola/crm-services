import type { DataSource } from 'typeorm';

import {
  CreateProfileFromAuthUserRegisteredHandler,
} from '../application/event-handlers/create-profile-from-auth-user-registered/create-profile-from-auth-user-registered.handler.js';
import type {
  AuthUserRegisteredData,
} from '../application/event-handlers/create-profile-from-auth-user-registered/create-profile-from-auth-user-registered.event.js';
import type { UserRepository } from '../db/user-repository.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { logger } from '../logger.js';
import type { OutboxRepository } from '../outbox/outbox-repository.js';

export interface InboundEnvelope {
  id: string;
  type: string;
  correlationId?: string;
  data: Record<string, unknown>;
}

export interface ProcessInboundEventDeps {
  dataSource: DataSource;
  processedEvents: ProcessedEventsRepository;
  users: UserRepository;
  outbox: OutboxRepository;
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
      await new CreateProfileFromAuthUserRegisteredHandler(deps.users, deps.outbox).handle(
        manager,
        envelope.data as unknown as AuthUserRegisteredData,
        { correlationId: envelope.correlationId ?? envelope.id, causationId: envelope.id },
      );
      return;
    }

    logger.info({ type: envelope.type }, '[users-service] no handler for this event type - ignoring');
  });
}
