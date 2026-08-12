import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { MembershipProjectionRepository } from './db/membership-projection-repository.js';
import { ensureAuthSchema } from './db/schema.js';
import { env } from './env.js';
import {
  handleCompanyMemberAdded,
  handleCompanyMemberRemoved,
  type CompanyMemberAddedData,
  type CompanyMemberRemovedData,
} from './handlers/company-member-events.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { AuthService } from './modules/auth/auth.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'auth-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureAuthSchema(pool);

  const authService = new AuthService(pool);
  const processedEvents = new ProcessedEventsRepository(pool);
  const projection = new MembershipProjectionRepository(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.added' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.removed' },
    ],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[auth-service] already processed - skipping');
        return;
      }

      if (envelope.type === 'company-member.added') {
        await handleCompanyMemberAdded(envelope.data as unknown as CompanyMemberAddedData, projection);
      } else if (envelope.type === 'company-member.removed') {
        await handleCompanyMemberRemoved(envelope.data as unknown as CompanyMemberRemovedData, projection);
      } else {
        logger.info({ type: envelope.type }, '[auth-service] no handler for this event type - ignoring');
      }
    },
  });

  const app = createApp(pool, authService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[auth-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[auth-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), pool.end()])
        .catch((err: unknown) => logger.error({ err }, '[auth-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[auth-service] failed to start');
  process.exit(1);
});
