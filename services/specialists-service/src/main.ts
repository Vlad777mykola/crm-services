import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { createDataSource } from './db/data-source.js';
import { PublicSpecialistProjectionRepository } from './db/public-specialist-projection-repository.js';
import { ensureSpecialistsSchema } from './db/schema.js';
import { env } from './env.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { SpecialistsService } from './modules/specialists/specialists.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'specialists-service.q';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  if (env.AUTO_DDL) {
    logger.warn('[specialists-service] AUTO_DDL is enabled; use only for temporary local compatibility');
    await ensureSpecialistsSchema(dataSource);
  }

  const processedEvents = new ProcessedEventsRepository();
  const projections = new PublicSpecialistProjectionRepository(dataSource);
  const specialistsService = new SpecialistsService(dataSource);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.created' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.updated' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-specialist.accepted' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-specialist.removed' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.created' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.updated' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.assigned' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.removed' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'review.received' },
    ],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };
      await processInboundEvent({ dataSource, processedEvents, projections }, envelope);
    },
  });

  const app = createApp(dataSource, consumer, specialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[specialists-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[specialists-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), dataSource.destroy()])
        .catch((err: unknown) => logger.error({ err }, '[specialists-service] error closing data source'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[specialists-service] failed to start');
  process.exit(1);
});
