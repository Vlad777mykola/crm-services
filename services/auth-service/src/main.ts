import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { createPool } from './db/pool.js';
import { MembershipProjectionRepository } from './db/membership-projection-repository.js';
import { ensureAuthSchema } from './db/schema.js';
import { env } from './env.js';
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
  const processedEvents = new ProcessedEventsRepository();
  const projection = new MembershipProjectionRepository();

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
      await processInboundEvent({ pool, processedEvents, projection }, envelope);
    },
  });

  const app = createApp(pool, authService, consumer);

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
