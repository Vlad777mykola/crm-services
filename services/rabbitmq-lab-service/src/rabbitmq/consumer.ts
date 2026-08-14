import type { Channel, ConsumeMessage } from 'amqplib';

import { logger } from '../logger.js';

export type StudentMessageHandler = (parsedBody: unknown, msg: ConsumeMessage) => Promise<void>;

export interface ConsumeStudentQueueOptions {
  prefetch?: number;
}

/**
 * Lesson 10 - the "normal application" pattern: a long-lived subscription
 * via `channel.consume()`. `channel.get()` (basic.get / polling) is
 * deliberately not wrapped here - it is for tests/demos only
 * (12-prefetch-and-workers.md explains why), never for a real consumer
 * loop.
 *
 * ACK happens only after `handler` resolves (Lesson 11). On failure it
 * NACKs without requeue (Lesson 12) - the lab never does an immediate
 * `nack(requeue=true)` loop, which is exactly the poison-message trap
 * students are warned about before touching retry/DLX topology.
 */
export async function consumeStudentQueue(
  channel: Channel,
  queue: string,
  handler: StudentMessageHandler,
  options: ConsumeStudentQueueOptions = {},
): Promise<string> {
  await channel.prefetch(options.prefetch ?? 1);
  const { consumerTag } = await channel.consume(queue, (msg) => {
    if (!msg) return;
    void handleDelivery(channel, msg, handler);
  });
  return consumerTag;
}

async function handleDelivery(channel: Channel, msg: ConsumeMessage, handler: StudentMessageHandler): Promise<void> {
  try {
    const parsed = JSON.parse(msg.content.toString('utf8'));
    await handler(parsed, msg);
    channel.ack(msg);
  } catch (err) {
    logger.error(
      { err, routingKey: msg.fields.routingKey },
      '[rabbitmq-lab-service] handler failed - nack without requeue',
    );
    channel.nack(msg, false, false);
  }
}
