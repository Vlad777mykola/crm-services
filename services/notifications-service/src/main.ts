import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureNotificationsSchema } from './db/schema.js';
import { EmailLogRepository } from './db/email-log-repository.js';
import { NotificationRepository } from './db/notification-repository.js';
import { RecipientRepository } from './db/recipient-repository.js';
import { env } from './env.js';
import { handleAnalyticsEvent } from './handlers/analytics-events.js';
import { handleDomainEvent } from './handlers/domain-events.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { NotificationsHttpService } from './modules/notifications/notifications.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE, ANALYTICS_EVENTS_EXCHANGE } from './rabbitmq/topology.js';
import type { WireEventEnvelope } from './wire-event.js';

const QUEUE_NAME = 'notifications-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureNotificationsSchema(pool);
  const processedEvents = new ProcessedEventsRepository(pool);

  const recipients = new RecipientRepository(pool);
  const notifications = new NotificationRepository(pool);
  const emailLogs = new EmailLogRepository(pool);
  const notificationsHttpService = new NotificationsHttpService(notifications);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'appointment.*' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'review.received' },
      { exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: 'analytics.company_rating_updated' },
    ],
    onMessage: async (parsedBody, _routingKey, exchange) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[notifications-service] already processed - skipping');
        return;
      }

      if (exchange === ANALYTICS_EVENTS_EXCHANGE) {
        await handleAnalyticsEvent(envelope, { recipients, notifications });
        return;
      }

      await handleDomainEvent(parsedBody as WireEventEnvelope, { recipients, notifications, emailLogs });
    },
  });

  const app = createApp(pool, consumer, notificationsHttpService);
  const server = app.listen(env.HEALTH_PORT, () => {
    logger.info(`[notifications-service] listening on :${env.HEALTH_PORT} (/health/*, /notifications/me*)`);
  });

  logger.info('[notifications-service] started - consuming domain.events + analytics.events');

  function shutdown(signal: string): void {
    logger.info(`[notifications-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), pool.end()])
        .catch((err: unknown) => logger.error({ err }, '[notifications-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[notifications-service] failed to start');
  process.exit(1);
});
