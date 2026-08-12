import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { MemberRepository } from './db/member-repository.js';
import { ensureCompanyMembersSchema } from './db/schema.js';
import { env } from './env.js';
import { handleCompanyCreated, type CompanyCreatedData } from './handlers/company-created.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { MembersService } from './modules/members/members.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'company-members-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureCompanyMembersSchema(pool);

  const processedEvents = new ProcessedEventsRepository(pool);
  const members = new MemberRepository(pool);
  const membersService = new MembersService(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [{ exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.created' }],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[company-members-service] already processed - skipping');
        return;
      }

      if (envelope.type === 'company.created') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await handleCompanyCreated(envelope.data as unknown as CompanyCreatedData, members, client);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
        return;
      }
      logger.info({ type: envelope.type }, '[company-members-service] no handler for this event type - ignoring');
    },
  });

  const app = createApp(pool, consumer, membersService);
  const server = app.listen(env.PORT, () => {
    logger.info(`[company-members-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[company-members-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), pool.end()])
        .catch((err: unknown) => logger.error({ err }, '[company-members-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[company-members-service] failed to start');
  process.exit(1);
});
