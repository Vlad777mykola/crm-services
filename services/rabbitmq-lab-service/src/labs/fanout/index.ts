import type { Channel } from 'amqplib';

import { assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToStudentExchange } from '../../rabbitmq/publisher.js';
import { STUDENT_FANOUT_EXCHANGE } from '../../rabbitmq/topology.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 06 - publish/subscribe (fanout): one message reaches every bound
 * queue, unlike a work queue where one message goes to exactly one worker.
 * See docs/students/rabitmq/lab-service/07-publish-subscribe.md.
 */
export const FANOUT_QUEUES = {
  a: studentName('fanout', 'a', 'q'),
  b: studentName('fanout', 'b', 'q'),
} as const;

const histories: Record<keyof typeof FANOUT_QUEUES, History<unknown>> = {
  a: createHistory(),
  b: createHistory(),
};

let channel: Channel | null = null;

export async function initFanoutLab(ch: Channel): Promise<void> {
  channel = ch;
  for (const key of Object.keys(FANOUT_QUEUES) as Array<keyof typeof FANOUT_QUEUES>) {
    const queue = FANOUT_QUEUES[key];
    await assertStudentQueue(ch, queue, { durable: true });
    // Fanout ignores the routing key entirely - '' is conventional.
    await bindStudentQueue(ch, queue, STUDENT_FANOUT_EXCHANGE, '');
    await consumeStudentQueue(ch, queue, async (parsedBody) => {
      histories[key].record(parsedBody);
    });
  }
}

export function publishFanout(payload: unknown): void {
  if (!channel) throw new Error('Fanout lab is not connected yet - wait for /health/ready');
  publishToStudentExchange(channel, STUDENT_FANOUT_EXCHANGE, '', payload);
}

export function getFanoutState() {
  return {
    a: { queue: FANOUT_QUEUES.a, received: histories.a.list() },
    b: { queue: FANOUT_QUEUES.b, received: histories.b.list() },
  };
}
