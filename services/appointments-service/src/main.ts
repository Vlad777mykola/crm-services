import { createApp } from './app.js';
import { AppointmentRecommendationRepository } from './db/appointment-recommendation-repository.js';
import { createPool } from './db/pool.js';
import { ensureAppointmentsSchema } from './db/schema.js';
import { ProjectionsRepository } from './db/projections-repository.js';
import { env } from './env.js';
import {
  handleAiRecommendationCreated,
  handleCompanyEvent,
  handleCompanyMemberAdded,
  handleCompanyMemberRemoved,
  handleServiceEvent,
  handleSpecialistServiceAssigned,
  handleSpecialistServiceRemoved,
  type AiRecommendationCreatedData,
  type CompanyEventData,
  type CompanyMemberAddedData,
  type CompanyMemberRemovedData,
  type ServiceEventData,
  type SpecialistServiceEventData,
} from './handlers/projection-events.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { AppointmentsService } from './modules/appointments/appointments.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { ANALYTICS_EVENTS_EXCHANGE, DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'appointments-service.q';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureAppointmentsSchema(pool);

  const processedEvents = new ProcessedEventsRepository(pool);
  const projections = new ProjectionsRepository(pool);
  const recommendations = new AppointmentRecommendationRepository(pool);
  const appointmentsService = new AppointmentsService(pool);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.created' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.updated' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.added' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company-member.removed' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.created' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'service.updated' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.assigned' },
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'specialist-service.removed' },
      // Moved from backend-projection-service in Phase 12.
      { exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: 'ai.appointment_recommendation_created' },
    ],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };

      const isNewEvent = await processedEvents.markProcessed(envelope.id);
      if (!isNewEvent) {
        logger.info({ eventId: envelope.id }, '[appointments-service] already processed - skipping');
        return;
      }

      if (envelope.type === 'ai.appointment_recommendation_created') {
        await handleAiRecommendationCreated(envelope.data as unknown as AiRecommendationCreatedData, recommendations);
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        switch (envelope.type) {
          case 'company.created':
          case 'company.updated':
            await handleCompanyEvent(envelope.data as unknown as CompanyEventData, projections, client);
            break;
          case 'company-member.added':
            await handleCompanyMemberAdded(envelope.data as unknown as CompanyMemberAddedData, projections, client);
            break;
          case 'company-member.removed':
            await handleCompanyMemberRemoved(envelope.data as unknown as CompanyMemberRemovedData, projections, client);
            break;
          case 'service.created':
          case 'service.updated':
            await handleServiceEvent(envelope.data as unknown as ServiceEventData, projections, client);
            break;
          case 'specialist-service.assigned':
            await handleSpecialistServiceAssigned(
              envelope.data as unknown as SpecialistServiceEventData,
              projections,
              client,
            );
            break;
          case 'specialist-service.removed':
            await handleSpecialistServiceRemoved(
              envelope.data as unknown as SpecialistServiceEventData,
              projections,
              client,
            );
            break;
          default:
            logger.info({ type: envelope.type }, '[appointments-service] no handler for this event type - ignoring');
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  });

  const app = createApp(pool, consumer, appointmentsService);
  const server = app.listen(env.PORT, () => {
    logger.info(`[appointments-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[appointments-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), pool.end()])
        .catch((err: unknown) => logger.error({ err }, '[appointments-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[appointments-service] failed to start');
  process.exit(1);
});
