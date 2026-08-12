import { createPool } from './db/pool.js';
import { ensureUsersSchema } from './db/schema.js';
import { UserRepository } from './db/user-repository.js';
import { env } from './env.js';
import { handleAuthUserRegistered, type AuthUserRegisteredData } from './handlers/auth-user-registered.js';
import { startHealthServer } from './http/health-server.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'users-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureUsersSchema(pool);

  const processedEvents = new ProcessedEventsRepository(pool);
  const users = new UserRepository(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [{ exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'auth.user_registered' }],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[users-service] already processed - skipping');
        return;
      }

      if (envelope.type === 'auth.user_registered') {
        await handleAuthUserRegistered(envelope.data as unknown as AuthUserRegisteredData, users);
        return;
      }
      logger.info({ type: envelope.type }, '[users-service] no handler for this event type - ignoring');
    },
  });

  const healthServer = startHealthServer(env.HEALTH_PORT, pool, consumer);

  logger.info('[users-service] started - consuming auth.user_registered from domain.events (no HTTP API yet)');

  function shutdown(signal: string): void {
    logger.info(`[users-service] received ${signal}, shutting down`);
    Promise.allSettled([consumer.close(), pool.end()])
      .catch((err: unknown) => logger.error({ err }, '[users-service] error during shutdown'))
      .finally(() => {
        healthServer.close(() => process.exit(0));
      });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[users-service] failed to start');
  process.exit(1);
});
