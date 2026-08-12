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

  async function waitForOutboxTable(): Promise<void> {
    let loggedHint = false;
    let lastWaitLogAt = 0;
    const waitLogIntervalMs = 10_000;

    while (!stopped && !(await repository.isOutboxTableReady())) {
      const now = Date.now();
      if (!loggedHint) {
        logger.warn(
          { schema: env.OUTBOX_SCHEMA || 'public' },
          '[outbox-publisher] outbox_events not found — start the owning service in another terminal (auth_schema: yarn dev:svc:auth) or use yarn dev:auth',
        );
        loggedHint = true;
        lastWaitLogAt = now;
      } else if (now - lastWaitLogAt >= waitLogIntervalMs) {
        logger.warn(
          { schema: env.OUTBOX_SCHEMA || 'public' },
          '[outbox-publisher] still waiting for outbox_events…',
        );
        lastWaitLogAt = now;
      }
      await new Promise((resolve) => setTimeout(resolve, env.POLL_INTERVAL_MS));
    }
  }

  async function pollLoop(): Promise<void> {
    await waitForOutboxTable();

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

  logger.info(
    { schema: env.OUTBOX_SCHEMA || 'public' },
    '[outbox-publisher] started - polling outbox_events for pending rows (Ctrl+C to stop)',
  );
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
