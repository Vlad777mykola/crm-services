import type { Channel } from 'amqplib';

import { assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToStudentExchange } from '../../rabbitmq/publisher.js';
import { STUDENT_DIRECT_EXCHANGE } from '../../rabbitmq/topology.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 07 - direct exchange: exact routing-key match, one queue per key.
 * See docs/students/rabitmq/lab-service/08-direct-routing.md.
 */
export const DIRECT_COLORS = ['red', 'blue', 'green'] as const;
export type DirectColor = (typeof DIRECT_COLORS)[number];

const queues: Record<DirectColor, string> = {
  red: studentName('direct', 'red', 'q'),
  blue: studentName('direct', 'blue', 'q'),
  green: studentName('direct', 'green', 'q'),
};

const histories: Record<DirectColor, History<unknown>> = {
  red: createHistory(),
  blue: createHistory(),
  green: createHistory(),
};

let channel: Channel | null = null;

export async function initDirectLab(ch: Channel): Promise<void> {
  channel = ch;
  for (const color of DIRECT_COLORS) {
    const queue = queues[color];
    await assertStudentQueue(ch, queue, { durable: true });
    await bindStudentQueue(ch, queue, STUDENT_DIRECT_EXCHANGE, color);
    await consumeStudentQueue(ch, queue, async (parsedBody) => {
      histories[color].record(parsedBody);
    });
  }
}

export function isDirectColor(value: string): value is DirectColor {
  return (DIRECT_COLORS as readonly string[]).includes(value);
}

export function publishDirect(color: DirectColor, payload: unknown): void {
  if (!channel) throw new Error('Direct lab is not connected yet - wait for /health/ready');
  publishToStudentExchange(channel, STUDENT_DIRECT_EXCHANGE, color, payload);
}

export function getDirectState() {
  return Object.fromEntries(
    DIRECT_COLORS.map((color) => [color, { queue: queues[color], received: histories[color].list() }]),
  );
}
