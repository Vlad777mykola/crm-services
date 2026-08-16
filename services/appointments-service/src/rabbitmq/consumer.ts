import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { connectManaged, declareRetryTopology, handleConsumerFailure, type ManagedConnectionContext } from '@crm/messaging-kit';

import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

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
  /** True once the channel/topology/consumer setup has fully completed (not just TCP-connected). */
  isConnected: () => boolean;
  /** Same as `isConnected()` - prefer this name for new call sites (e.g. health checks). */
  isReady: () => boolean;
  close: () => Promise<void>;
}

/**
 * Declares topology, binds a durable queue with DLX, and consumes it.
 *
 * Connection lifecycle (connect/reconnect/backoff/readiness) is owned by
 * `connectManaged` (@crm/messaging-kit). This module only owns the channel,
 * topology, prefetch, consume(), and ACK/NACK/retry semantics - and reports
 * an unexpected channel closure back to the managed lifecycle so a dead
 * consumer channel always triggers a full reconnect instead of leaving the
 * service silently stuck.
 */
export async function consumeFromRabbitMq(options: ConsumeOptions): Promise<RabbitMqConsumer> {
  let channel: Channel | null = null;
  let settleFirstReady: (() => void) | null = null;
  const firstReady = new Promise<void>((resolve) => {
    settleFirstReady = resolve;
  });

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
    logger.error({ err, routingKey: msg.fields.routingKey }, '[rabbitmq] failed to process message — applying retry/parking policy');
    await handleConsumerFailure(channel, msg, SERVICE_NAME, err);
  }
}
