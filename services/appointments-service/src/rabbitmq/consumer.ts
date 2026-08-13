import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { declareRetryTopology, handleConsumerFailure } from '@crm/messaging-kit';

import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

const RECONNECT_MS = 1000;
const SERVICE_NAME = 'appointments-service';

export interface BindingSpec {
  exchange: string;
  routingKey: string;
}

export interface ConsumeOptions {
  url: string;
  queue: string;
  deadLetterExchange: string;
  bindings: BindingSpec[];
  onMessage: (parsedBody: unknown, routingKey: string, exchange: string) => Promise<void>;
}

export interface RabbitMqConsumer {
  isConnected: () => boolean;
  close: () => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Declares topology, binds a durable queue with DLX, and reconnects on connection loss. */
export async function consumeFromRabbitMq(options: ConsumeOptions): Promise<RabbitMqConsumer> {
  let connected = false;
  let closed = false;
  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;
  let connecting = false;

  async function bindAndConsume(ch: Channel): Promise<void> {
    await declareTopology(ch);
    await declareRetryTopology(ch, { serviceName: SERVICE_NAME, sourceExchange: 'domain.events' });
    await declareRetryTopology(ch, { serviceName: SERVICE_NAME, sourceExchange: 'analytics.events' });
    await ch.assertQueue(options.queue, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': options.deadLetterExchange },
    });
    for (const binding of options.bindings) {
      await ch.bindQueue(options.queue, binding.exchange, binding.routingKey);
    }
    await ch.prefetch(1);
    await ch.consume(options.queue, (msg) => {
      if (!msg) {
        return;
      }
      void handleMessage(ch, msg, options.onMessage);
    });
  }

  async function connectLoop(): Promise<void> {
    if (connecting || closed) {
      return;
    }
    connecting = true;
    while (!closed) {
      try {
        connection = await amqp.connect(options.url);
        connected = true;
        connection.on('close', () => {
          connected = false;
          channel = null;
          if (!closed) {
            logger.warn('[rabbitmq] connection closed — reconnecting');
            connecting = false;
            setTimeout(() => void connectLoop(), RECONNECT_MS);
          }
        });
        connection.on('error', (err: unknown) => {
          logger.warn({ err }, '[rabbitmq] connection error');
        });

        channel = await connection.createChannel();
        await bindAndConsume(channel);
        connecting = false;
        return;
      } catch (err) {
        connected = false;
        logger.warn({ err }, '[rabbitmq] connect failed — retrying');
        await sleep(RECONNECT_MS);
      }
    }
    connecting = false;
  }

  await connectLoop();

  return {
    isConnected: () => connected,
    close: async () => {
      closed = true;
      connected = false;
      if (channel) {
        await channel.close().catch(() => {});
      }
      if (connection) {
        await connection.close().catch(() => {});
      }
    },
  };
}

async function handleMessage(
  channel: Channel,
  msg: ConsumeMessage,
  onMessage: (parsedBody: unknown, routingKey: string, exchange: string) => Promise<void>,
): Promise<void> {
  try {
    const parsed = JSON.parse(msg.content.toString('utf8'));
    await onMessage(parsed, msg.fields.routingKey, msg.fields.exchange);
    channel.ack(msg);
  } catch (err) {
    logger.error({ err, routingKey: msg.fields.routingKey }, '[rabbitmq] failed to process message — applying retry/parking policy');
    await handleConsumerFailure(channel, msg, SERVICE_NAME, err);
  }
}
