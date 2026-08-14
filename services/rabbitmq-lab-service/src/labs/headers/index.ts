import type { Channel } from 'amqplib';

import { assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToStudentExchange } from '../../rabbitmq/publisher.js';
import { STUDENT_HEADERS_EXCHANGE } from '../../rabbitmq/topology.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 10 - headers exchange: routes on message headers instead of a
 * routing key. Educational only - the current CRM event model uses topic
 * routing (`domain.events`), and headers exchange should not be introduced
 * into CRM without a concrete requirement.
 * See docs/students/rabitmq/lab-service/10-headers-routing.md.
 */
const CRITERIA = { format: 'pdf', urgent: true } as const;

export const HEADERS_QUEUES = {
  all: studentName('headers', 'all', 'q'),
  any: studentName('headers', 'any', 'q'),
} as const;

interface HeadersReceived {
  payload: unknown;
  headers: Record<string, unknown> | undefined;
}

const histories: Record<keyof typeof HEADERS_QUEUES, History<HeadersReceived>> = {
  all: createHistory(),
  any: createHistory(),
};

let channel: Channel | null = null;

export async function initHeadersLab(ch: Channel): Promise<void> {
  channel = ch;

  await assertStudentQueue(ch, HEADERS_QUEUES.all, { durable: true });
  await bindStudentQueue(ch, HEADERS_QUEUES.all, STUDENT_HEADERS_EXCHANGE, '', { 'x-match': 'all', ...CRITERIA });
  await consumeStudentQueue(ch, HEADERS_QUEUES.all, async (parsedBody, msg) => {
    histories.all.record({ payload: parsedBody, headers: msg.properties.headers });
  });

  await assertStudentQueue(ch, HEADERS_QUEUES.any, { durable: true });
  await bindStudentQueue(ch, HEADERS_QUEUES.any, STUDENT_HEADERS_EXCHANGE, '', { 'x-match': 'any', ...CRITERIA });
  await consumeStudentQueue(ch, HEADERS_QUEUES.any, async (parsedBody, msg) => {
    histories.any.record({ payload: parsedBody, headers: msg.properties.headers });
  });
}

export function publishHeaders(headers: Record<string, unknown>, payload: unknown): void {
  if (!channel) throw new Error('Headers lab is not connected yet - wait for /health/ready');
  publishToStudentExchange(channel, STUDENT_HEADERS_EXCHANGE, '', payload, { headers });
}

export function getHeadersState() {
  return {
    all: { queue: HEADERS_QUEUES.all, match: 'all' as const, criteria: CRITERIA, received: histories.all.list() },
    any: { queue: HEADERS_QUEUES.any, match: 'any' as const, criteria: CRITERIA, received: histories.any.list() },
  };
}
