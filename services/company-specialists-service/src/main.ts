import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { createDataSource } from './db/data-source.js';
import { ensureCompanySpecialistsSchema } from './db/schema.js';
import { env } from './env.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { CompanySpecialistsService } from './modules/company-specialists/company-specialists.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'company-specialists-service.q';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureCompanySpecialistsSchema(dataSource);

  const service = new CompanySpecialistsService(dataSource);
  const processedEvents = new ProcessedEventsRepository();

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.added' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.role_changed' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.removed' },
    ],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };
      await processInboundEvent({ dataSource, processedEvents }, envelope);
    },
  });

  const app = createApp(dataSource, consumer, service);

  const server = app.listen(env.PORT, () => {
    logger.info(`[company-specialists-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[company-specialists-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), dataSource.destroy()])
        .catch((err: unknown) => logger.error({ err }, '[company-specialists-service] error closing data source'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[company-specialists-service] failed to start');
  process.exit(1);
});
