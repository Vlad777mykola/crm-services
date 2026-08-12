import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';

import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

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

export async function consumeFromRabbitMq(options: ConsumeOptions): Promise<RabbitMqConsumer> {
  const connection: ChannelModel = await amqp.connect(options.url);
  let connected = true;
  connection.on('close', () => {
    connected = false;
  });
  connection.on('error', (err: unknown) => logger.warn({ err }, '[companies-service] RabbitMQ connection error'));

  const channel = await connection.createChannel();
  await declareTopology(channel);

  await channel.assertQueue(options.queue, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': options.deadLetterExchange },
  });
  for (const binding of options.bindings) {
    await channel.bindQueue(options.queue, binding.exchange, binding.routingKey);
  }

  await channel.prefetch(1);
  await channel.consume(options.queue, (msg) => {
    if (!msg) return;
    void handleMessage(channel, msg, options.onMessage);
  });

  return {
    isConnected: () => connected,
    close: async () => {
      await channel.close().catch(() => {});
      await connection.close().catch(() => {});
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
    logger.error(
      { err, routingKey: msg.fields.routingKey },
      '[companies-service] failed to process message - routing to dead-letter queue',
    );
    channel.nack(msg, false, false);
  }
}
