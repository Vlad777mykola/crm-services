import { env } from './env.js';
import { startHttpServer } from './http/server.js';
import { logger } from './logger.js';
import { RabbitMqMetricsStore } from './metrics/store.js';
import { consumeFromRabbitMq } from './rabbitmq/consumer.js';
import { ANALYTICS_EVENTS_EXCHANGE, DOMAIN_EVENTS_EXCHANGE } from './rabbitmq/topology.js';

const QUEUE_NAME = 'metrics-service.q';
const SERVICE_NAME = 'metrics-service';

interface WireEnvelopeLike {
  type?: string;
  time?: string;
}

async function bootstrap(): Promise<void> {
  const store = new RabbitMqMetricsStore(SERVICE_NAME);

  const consumer = await consumeFromRabbitMq({
    url: env.RABBITMQ_URL,
    queue: QUEUE_NAME,
    bindings: [
      { exchange: DOMAIN_EVENTS_EXCHANGE, routingKey: '#' },
      { exchange: ANALYTICS_EVENTS_EXCHANGE, routingKey: '#' },
    ],
    onMessage: async (parsedBody, routingKey, exchange) => {
      try {
        const envelope = parsedBody as WireEnvelopeLike;
        const eventType = envelope.type ?? routingKey;
        const emittedAtMs = envelope.time ? Date.parse(envelope.time) : null;
        store.recordMessage({ eventType, exchange, emittedAtMs });
        logger.info({ eventType, exchange }, `[${SERVICE_NAME}] observed message`);
      } catch (err) {
        store.recordError();
        throw err;
      }
    },
  });

  const httpServer = startHttpServer(env.METRICS_PORT, store, consumer);

  logger.info(`[${SERVICE_NAME}] listening on '${QUEUE_NAME}' bound to '#' on both exchanges (Ctrl+C to stop)`);

  function shutdown(signal: string): void {
    logger.info(`[${SERVICE_NAME}] received ${signal}, shutting down`);
    consumer
      .close()
      .catch((err: unknown) => logger.error({ err }, `[${SERVICE_NAME}] error closing RabbitMQ connection`))
      .finally(() => {
        httpServer.close(() => process.exit(0));
      });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, `[${SERVICE_NAME}] failed to start`);
  process.exit(1);
});
