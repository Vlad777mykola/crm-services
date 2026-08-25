import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { createDataSource } from './db/data-source.js';
import { ensureServicesSchema } from './db/schema.js';
import { env } from './env.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { ServiceSpecialistsService } from './modules/services/service-specialists.service.js';
import { ServicesService } from './modules/services/services.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'services-catalog-service.q';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureServicesSchema(dataSource);

  const servicesService = new ServicesService(dataSource);
  const serviceSpecialistsService = new ServiceSpecialistsService(dataSource);
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

  const app = createApp(dataSource, consumer, servicesService, serviceSpecialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[services-catalog-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[services-catalog-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), dataSource.destroy()])
        .catch((err: unknown) => logger.error({ err }, '[services-catalog-service] error closing data source'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[services-catalog-service] failed to start');
  process.exit(1);
});
