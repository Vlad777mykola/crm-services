import type { Pool, PoolClient } from 'pg';

import type { EmailLogRepository } from '../db/email-log-repository.js';
import type { NotificationRepository } from '../db/notification-repository.js';
import type { RecipientRepository } from '../db/recipient-repository.js';
import { handleAnalyticsEvent } from '../handlers/analytics-events.js';
import { handleDomainEvent } from '../handlers/domain-events.js';
import type { ProcessedEventsRepository } from '../idempotency/processed-events-repository.js';
import { logger } from '../logger.js';
import { ANALYTICS_EVENTS_EXCHANGE } from '../rabbitmq/topology.js';
import type { WireEventEnvelope } from '../wire-event.js';

export interface InboundEnvelope {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface ProcessInboundEventDeps {
  pool: Pool;
  processedEvents: ProcessedEventsRepository;
  recipients: RecipientRepository;
  notifications: NotificationRepository;
  emailLogs: EmailLogRepository;
}

export async function processInboundEvent(
  deps: ProcessInboundEventDeps,
  envelope: InboundEnvelope,
  exchange: string,
  parsedBody: unknown,
): Promise<void> {
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');

    const isNewEvent = await deps.processedEvents.markProcessed(client, envelope.id);
    if (!isNewEvent) {
      await client.query('COMMIT');
      logger.info({ eventId: envelope.id }, '[notifications-service] already processed - skipping');
      return;
    }

    if (exchange === ANALYTICS_EVENTS_EXCHANGE) {
      await handleAnalyticsEvent(client, envelope, {
        recipients: deps.recipients,
        notifications: deps.notifications,
      });
    } else {
      await handleDomainEvent(client, parsedBody as WireEventEnvelope, {
        recipients: deps.recipients,
        notifications: deps.notifications,
        emailLogs: deps.emailLogs,
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
