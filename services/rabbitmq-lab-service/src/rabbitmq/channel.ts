import type { Channel, ChannelModel } from 'amqplib';

import { assertObservableExchange, assertStudentName } from './names.js';

/** Lesson 2 - a connection hosts one or more independent channels. */
export async function createChannel(connection: ChannelModel): Promise<Channel> {
  return connection.createChannel();
}

export interface AssertStudentExchangeOptions {
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
}

/**
 * Guarded wrapper around `channel.assertExchange` - refuses anything outside
 * `student.rabbitmq-lab.*` (see rabbitmq/names.ts).
 */
export async function assertStudentExchange(
  channel: Channel,
  name: string,
  options: AssertStudentExchangeOptions,
): Promise<void> {
  assertStudentName(name, 'exchange');
  await channel.assertExchange(name, options.type, {
    durable: options.durable ?? true,
    autoDelete: options.autoDelete ?? false,
  });
}

export interface AssertStudentQueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, unknown>;
}

/**
 * Guarded wrapper around `channel.assertQueue` - refuses anything outside
 * `student.rabbitmq-lab.*` (see rabbitmq/names.ts).
 */
export async function assertStudentQueue(
  channel: Channel,
  name: string,
  options: AssertStudentQueueOptions = {},
): Promise<void> {
  assertStudentName(name, 'queue');
  await channel.assertQueue(name, {
    durable: options.durable ?? true,
    exclusive: options.exclusive ?? false,
    autoDelete: options.autoDelete ?? false,
    arguments: options.arguments,
  });
}

/**
 * Binds a lab-owned queue to an exchange. `source` may be a
 * `student.rabbitmq-lab.*` exchange, OR one of the real CRM domain exchanges
 * for read-only observation (Lesson 30 / labs/companies-observer). `queue`
 * must always be student-namespaced - the lab never reuses a real service's
 * own queue.
 *
 * `args` is only needed for the headers exchange (`{ 'x-match': 'all' | 'any', ...criteria }`)
 * - routingKey/pattern is ignored by RabbitMQ for headers bindings, pass `''`.
 */
export async function bindStudentQueue(
  channel: Channel,
  queue: string,
  source: string,
  routingKey: string,
  args?: Record<string, unknown>,
): Promise<void> {
  assertStudentName(queue, 'queue');
  assertObservableExchange(source);
  await channel.bindQueue(queue, source, routingKey, args);
}

const DOMAIN_EVENTS_EXCHANGE = 'domain.events';

/**
 * Read-only observer binding to a real CRM exchange (LAB-08). Uses a
 * server-generated exclusive auto-delete queue - never a real service queue.
 */
export async function bindEphemeralDomainObserver(
  channel: Channel,
  routingKey: string,
): Promise<string> {
  assertObservableExchange(DOMAIN_EVENTS_EXCHANGE);
  const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue, DOMAIN_EVENTS_EXCHANGE, routingKey);
  return queue;
}
