import { AppointmentRecommendationRepository } from './db/projections/appointment-recommendation-repository.js';
import { CompanyInsightRepository } from './db/projections/company-insight-repository.js';
import { ensureProjectionTables } from './db/projections/schema.js';
import { createPool } from './db/pool.js';
import { env } from './env.js';
import { handleAiCompanyInsightCreated } from './handlers/ai-company-insight-created.js';
import { handleAiRecommendationCreated } from './handlers/ai-recommendation-created.js';
import { startHealthServer } from './http/health-server.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { ANALYTICS_EVENTS_EXCHANGE, DOMAIN_EVENTS_DLX } from './rabbitmq/topology.js';

const QUEUE_NAME = 'backend-projection-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureProjectionTables(pool);

  const processedEvents = new ProcessedEventsRepository(pool);
  await processedEvents.ensureTable();

  const recommendations = new AppointmentRecommendationRepository(pool);
  const insights = new CompanyInsightRepository(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: 'ai.appointment_recommendation_created' },
      { exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: 'ai.company_insight_created' },
    ],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[backend-projection-service] already processed - skipping');
        return;
      }

      if (envelope.type === 'ai.appointment_recommendation_created') {
        await handleAiRecommendationCreated(envelope.data as never, recommendations);
        return;
      }
      if (envelope.type === 'ai.company_insight_created') {
        await handleAiCompanyInsightCreated(envelope.data as never, insights);
        return;
      }
      logger.info({ type: envelope.type }, '[backend-projection-service] no handler for this event type - ignoring');
    },
  });

  const healthServer = startHealthServer(env.HEALTH_PORT, pool, consumer);

  logger.info('[backend-projection-service] started - consuming ai.* result events from analytics.events');

  function shutdown(signal: string): void {
    logger.info(`[backend-projection-service] received ${signal}, shutting down`);
    Promise.allSettled([consumer.close(), pool.end()])
      .catch((err: unknown) => logger.error({ err }, '[backend-projection-service] error during shutdown'))
      .finally(() => {
        healthServer.close(() => process.exit(0));
      });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[backend-projection-service] failed to start');
  process.exit(1);
});
