import { createApp } from './app.js';
import { processInboundEvent } from './consumer/process-inbound-event.js';
import { createDataSource } from './db/data-source.js';
import { MemberRepository } from './db/member-repository.js';
import { ensureCompanyMembersSchema } from './db/schema.js';
import { env } from './env.js';
import { ProcessedEventsRepository } from './idempotency/processed-events-repository.js';
import { logger } from './logger.js';
import { MembersService } from './modules/members/members.service.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { DOMAIN_EVENTS_DLX, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'company-members-service.q';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureCompanyMembersSchema(dataSource);

  const processedEvents = new ProcessedEventsRepository();
  const members = new MemberRepository(dataSource);
  const membersService = new MembersService(dataSource);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    deadLetterExchange: DOMAIN_EVENTS_DLX,
    bindings: [{ exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: 'company.created' }],
    onMessage: async (parsedBody) => {
      const envelope = parsedBody as { id: string; type: string; data: Record<string, unknown> };
      await processInboundEvent({ dataSource, processedEvents, members }, envelope);
    },
  });

  const app = createApp(dataSource, consumer, membersService);
  const server = app.listen(env.PORT, () => {
    logger.info(`[company-members-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[company-members-service] received ${signal}, shutting down`);
    server.close(() => {
      Promise.allSettled([consumer.close(), dataSource.destroy()])
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
