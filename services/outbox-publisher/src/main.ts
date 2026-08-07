import { OutboxRepository } from './db/outbox-repository.js';
import { env } from './env.js';
import { startHealthServer } from './http/health-server.js';
import { logger } from './logger.js';
import { publishPendingBatch } from './publisher/poll-and-publish.js';
import { RabbitMqPublisher } from './rabbitmq/publisher.js';

async function bootstrap(): Promise<void> {
  const repository = new OutboxRepository();
  const publisher = new RabbitMqPublisher();
  await publisher.connect();

  const healthServer = startHealthServer(env.HEALTH_PORT, repository, publisher);

  let stopped = false;

  async function pollLoop(): Promise<void> {
    while (!stopped) {
      try {
        const processed = await publishPendingBatch(repository, publisher);
        if (processed === 0) {
          await new Promise((resolve) => setTimeout(resolve, env.POLL_INTERVAL_MS));
        }
      } catch (err) {
        logger.error({ err }, '[outbox-publisher] poll loop error');
        await new Promise((resolve) => setTimeout(resolve, env.POLL_INTERVAL_MS));
      }
    }
  }

  logger.info('[outbox-publisher] started - polling outbox_events for pending rows (Ctrl+C to stop)');
  const loopPromise = pollLoop();

  function shutdown(signal: string): void {
    logger.info(`[outbox-publisher] received ${signal}, shutting down`);
    stopped = true;
    loopPromise
      .then(() => Promise.allSettled([publisher.close(), repository.close()]))
      .catch((err: unknown) => logger.error({ err }, '[outbox-publisher] error during shutdown'))
      .finally(() => {
        healthServer.close(() => process.exit(0));
      });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[outbox-publisher] failed to start');
  process.exit(1);
});
