import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { connectManaged, type ManagedConnectionContext } from '@crm/messaging-kit';

import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

const SERVICE_NAME = 'metrics-service';

export interface BindingSpec {
  exchange: string;
  routingKey: string;
}

export interface ConsumeOptions {
  url: string;
  queue: string;
  bindings: BindingSpec[];
  onMessage: (parsedBody: unknown, routingKey: string, exchange: string) => Promise<void>;
}

export interface RabbitMqConsumer {
  /** True once the channel/topology/consumer setup has fully completed (not just TCP-connected). */
  isConnected: () => boolean;
  /** Same as `isConnected()` - prefer this name for new call sites (e.g. health checks). */
  isReady: () => boolean;
  close: () => Promise<void>;
}

/**
 * Observer queue: reuses `connectManaged` for connection lifecycle (same as
 * the retry/DLX consumers), but keeps its own message-failure semantics -
 * failed messages are dropped (`nack(msg, false, false)`), not routed
 * through the retry/parking topology in @crm/messaging-kit.
 */
export async function consumeFromRabbitMq(options: ConsumeOptions): Promise<RabbitMqConsumer> {
  let channel: Channel | null = null;
  let settleFirstReady: (() => void) | null = null;
  const firstReady = new Promise<void>((resolve) => {
    settleFirstReady = resolve;
  });

  async function bindAndConsume(ch: Channel): Promise<void> {
    await declareTopology(ch);
    await ch.assertQueue(options.queue, { durable: true });
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

  const managed = connectManaged({
    url: options.url,
    serviceName: SERVICE_NAME,
    logger,
    setup: async (connection: ChannelModel, lifecycle: ManagedConnectionContext) => {
      const ch = await connection.createChannel();
      channel = ch;
      ch.once('close', () => {
        if (channel !== ch) {
          return;
        }
        channel = null;
        lifecycle.invalidate(new Error(`${SERVICE_NAME} consumer channel closed unexpectedly`));
      });
      await bindAndConsume(ch);
      settleFirstReady?.();
      settleFirstReady = null;
    },
    onDisconnected: () => {
      channel = null;
    },
  });

  await firstReady;

  return {
    isConnected: () => managed.isReady(),
    isReady: () => managed.isReady(),
    close: () => managed.close(),
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
    logger.error(
      { err, routingKey: msg.fields.routingKey },
      '[metrics-service] failed to process message — dropping it',
    );
    channel.nack(msg, false, false);
  }
}
