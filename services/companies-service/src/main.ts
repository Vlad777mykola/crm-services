import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { CompanyInsightRepository } from './db/company-insight-repository.js';
import { createPool } from './db/pool.js';
import { ensureCompaniesSchema } from './db/schema.js';
import { env } from './env.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { CompaniesService } from './modules/companies/companies.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { ANALYTICS_EVENTS_EXCHANGE, DOMAIN_EVENTS_DLX } from './rabbitmq/topology.js';

const QUEUE_NAME = 'companies-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureCompaniesSchema(pool);

  const processedEvents = new ProcessedEventsRepository();
  const insights = new CompanyInsightRepository();
  const companiesService = new CompaniesService(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [{ exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: 'ai.company_insight_created' }],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };
      await processInboundEvent({ pool, processedEvents, insights }, envelope);
    },
  });

  const app = createApp(pool, consumer, companiesService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[companies-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[companies-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), pool.end()])
        .catch((err: unknown) => logger.error({ err }, '[companies-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[companies-service] failed to start');
  process.exit(1);
});
