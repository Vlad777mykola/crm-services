import { env } from './env.js';
import { isDatabaseReady, setDatabaseReady, setRabbitMqReady } from './health/state.js';
import { startHttpServer } from './http/server.js';
import { setLabChannel, setLabPool } from './lab-context.js';
import { ensureRabbitMqLabSchema } from './db/schema.js';
import { createPool } from './db/pool.js';
import { initCompaniesObserverLab } from './labs/companies-observer/index.js';
import { initConfirmsLab } from './labs/confirms/index.js';
import { initDirectLab } from './labs/direct/index.js';
import { initDlqLab } from './labs/dlq/index.js';
import { initFanoutLab } from './labs/fanout/index.js';
import { initHeadersLab } from './labs/headers/index.js';
import { initHelloLab } from './labs/hello/index.js';
import { initIdempotencyLab } from './labs/idempotency/index.js';
import { declareOutboxExchange } from './labs/outbox/index.js';
import { initRetryLab } from './labs/retry/index.js';
import { initRpcLab } from './labs/rpc/index.js';
import { initTopicLab } from './labs/topic/index.js';
import { initWorkQueueLab } from './labs/work-queue/index.js';
import { logger } from './logger.js';
import { startLabOutboxPublisher } from './outbox/publisher.js';
import { createChannel } from './rabbitmq/channel.js';
import { connectManaged } from './rabbitmq/connection.js';
import { declareCoreStudentTopology } from './rabbitmq/topology.js';

const SERVICE_NAME = 'rabbitmq-lab-service';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  setLabPool(pool);
  try {
    await ensureRabbitMqLabSchema(pool);
    setDatabaseReady(true);
  } catch (err) {
    logger.error({ err }, `[${SERVICE_NAME}] database schema setup failed`);
    setDatabaseReady(false);
  }

  let outboxTimer: NodeJS.Timeout | null = null;

  const managed = await connectManaged({
    url: env.RABBITMQ_URL,
    onConnect: async (connection) => {
      const channel = await createChannel(connection);
      setLabChannel(channel);
      await declareCoreStudentTopology(channel);
      await declareOutboxExchange(channel);
      await initHelloLab(channel);
      await initDirectLab(channel);
      await initTopicLab(channel);
      await initFanoutLab(channel);
      await initHeadersLab(channel);
      await initWorkQueueLab(channel);
      await initConfirmsLab(connection, channel);
      await initDlqLab(channel);
      await initRetryLab(channel);
      await initRpcLab(channel);
      await initCompaniesObserverLab(channel);
      if (isDatabaseReady()) {
        await initIdempotencyLab(channel, pool);
        outboxTimer = startLabOutboxPublisher(pool, channel);
      }
      setRabbitMqReady(true);
    },
    onDisconnect: () => {
      setRabbitMqReady(false);
      if (outboxTimer) clearInterval(outboxTimer);
    },
  });

  const httpServer = startHttpServer(env.PORT);

  logger.info(`[${SERVICE_NAME}] ready - writes only to student.rabbitmq-lab.* (Ctrl+C to stop)`);

  function shutdown(signal: string): void {
    logger.info(`[${SERVICE_NAME}] received ${signal}, shutting down`);
    if (outboxTimer) clearInterval(outboxTimer);
    managed
      .close()
      .catch((err: unknown) => logger.error({ err }, `[${SERVICE_NAME}] error closing RabbitMQ connection`))
      .finally(() => {
        void pool.end().finally(() => {
          httpServer.close(() => process.exit(0));
        });
      });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, `[${SERVICE_NAME}] failed to start`);
  process.exit(1);
});
