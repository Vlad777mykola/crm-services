import type { Channel } from 'amqplib';

import { assertStudentName } from './names.js';

export interface PublishOptions {
  mandatory?: boolean;
  /** Only meaningful for the headers exchange (Lesson 09 - headers routing). */
  headers?: Record<string, unknown>;
}

/**
 * Publishes JSON to a student-namespaced exchange. Refuses anything else -
 * this is the one function every lab uses to publish, so the safety
 * boundary only needs to be enforced in one place.
 */
export function publishToStudentExchange(
  channel: Channel,
  exchange: string,
  routingKey: string,
  payload: unknown,
  options: PublishOptions = {},
): boolean {
  assertStudentName(exchange, 'exchange');
  const content = Buffer.from(JSON.stringify(payload));
  return channel.publish(exchange, routingKey, content, {
    contentType: 'application/json',
    mandatory: options.mandatory ?? false,
    headers: options.headers,
  });
}

/**
 * Lesson 4 - the default (nameless) exchange that every broker has built
 * in. `exchange=""`, and the routing key must equal the queue name. Still
 * guarded: the queue itself must be student-namespaced.
 */
export interface DefaultPublishOptions {
  replyTo?: string;
  correlationId?: string;
}

export function publishToDefaultExchange(
  channel: Channel,
  queue: string,
  payload: unknown,
  options: DefaultPublishOptions = {},
): boolean {
  assertStudentName(queue, 'queue');
  const content = Buffer.from(JSON.stringify(payload));
  return channel.publish('', queue, content, {
    contentType: 'application/json',
    replyTo: options.replyTo,
    correlationId: options.correlationId,
  });
}
