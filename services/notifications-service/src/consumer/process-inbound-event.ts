import type { DataSource } from 'typeorm';

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
  dataSource: DataSource;
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
  await deps.dataSource.transaction(async (manager) => {
    const isNewEvent = await deps.processedEvents.markProcessed(manager, envelope.id);
    if (!isNewEvent) {
      logger.info({ eventId: envelope.id }, '[notifications-service] already processed - skipping');
      return;
    }

    if (exchange === ANALYTICS_EVENTS_EXCHANGE) {
      await handleAnalyticsEvent(manager, envelope, {
        recipients: deps.recipients,
        notifications: deps.notifications,
      });
    } else {
      await handleDomainEvent(manager, parsedBody as WireEventEnvelope, {
        recipients: deps.recipients,
        notifications: deps.notifications,
        emailLogs: deps.emailLogs,
      });
    }
  });
}
