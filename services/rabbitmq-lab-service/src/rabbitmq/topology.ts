import type { Channel } from 'amqplib';

import { assertStudentExchange } from './channel.js';
import { studentName } from './names.js';

/**
 * The four routing-concept exchanges shared across several lessons
 * (07-direct-routing.md, 09-topic-routing.md, "publish/subscribe" fanout,
 * 10-headers-routing.md). Each lab additionally declares its own queues on
 * demand - see labs/hello for the smallest possible example, one queue with
 * no shared exchange at all.
 */
export const STUDENT_DIRECT_EXCHANGE = studentName('direct');
export const STUDENT_TOPIC_EXCHANGE = studentName('topic');
export const STUDENT_FANOUT_EXCHANGE = studentName('fanout');
export const STUDENT_HEADERS_EXCHANGE = studentName('headers');

/**
 * Declares the exchanges this service depends on across labs. Idempotent,
 * like every other service's `declareTopology()` (see
 * services/metrics-service/src/rabbitmq/topology.ts) - whichever process
 * starts first "wins", and every later caller gets a no-op confirmation of
 * the same shape.
 */
export async function declareCoreStudentTopology(channel: Channel): Promise<void> {
  await assertStudentExchange(channel, STUDENT_DIRECT_EXCHANGE, { type: 'direct' });
  await assertStudentExchange(channel, STUDENT_TOPIC_EXCHANGE, { type: 'topic' });
  await assertStudentExchange(channel, STUDENT_FANOUT_EXCHANGE, { type: 'fanout' });
  await assertStudentExchange(channel, STUDENT_HEADERS_EXCHANGE, { type: 'headers' });
}
