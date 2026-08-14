import type { Channel } from 'amqplib';

import { logger } from '../../logger.js';
import { assertStudentExchange, assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToDefaultExchange } from '../../rabbitmq/publisher.js';
import { createHistory } from '../shared/history.js';

/**
 * Lesson 17 - DLX: rejected/expired messages route to a dead queue.
 * See docs/students/rabitmq/lab-service/15-retry-dlx-ttl.md.
 */
export const DLX_EXCHANGE = studentName('dlx');
export const DLQ_SOURCE_QUEUE = studentName('source.q');
export const DEAD_QUEUE = studentName('dead.q');

const sourceHistory = createHistory<unknown>();
const deadHistory = createHistory<unknown>();

let channel: Channel | null = null;

export async function initDlqLab(ch: Channel): Promise<void> {
  channel = ch;
  await assertStudentExchange(ch, DLX_EXCHANGE, { type: 'topic' });
  await assertStudentQueue(ch, DEAD_QUEUE, { durable: true });
  await bindStudentQueue(ch, DEAD_QUEUE, DLX_EXCHANGE, '#');

  await assertStudentQueue(ch, DLQ_SOURCE_QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': DLX_EXCHANGE },
  });

  await ch.prefetch(1);
  await ch.consume(DLQ_SOURCE_QUEUE, (msg) => {
    if (!msg) return;
    try {
      const parsed = JSON.parse(msg.content.toString('utf8'));
      sourceHistory.record(parsed);
      logger.info({ payload: parsed }, '[rabbitmq-lab-service] dlq lab rejecting message on purpose');
      ch.reject(msg, false);
    } catch (err) {
      logger.error({ err }, '[rabbitmq-lab-service] dlq lab handler error');
      ch.nack(msg, false, false);
    }
  });

  await ch.consume(DEAD_QUEUE, (msg) => {
    if (!msg) return;
    try {
      const parsed = JSON.parse(msg.content.toString('utf8'));
      deadHistory.record(parsed);
      ch.ack(msg);
    } catch {
      ch.nack(msg, false, false);
    }
  });
}

export function publishDlqFailure(payload: unknown): void {
  if (!channel) throw new Error('DLQ lab is not connected yet - wait for /health/ready');
  publishToDefaultExchange(channel, DLQ_SOURCE_QUEUE, payload);
}

export function getDlqState() {
  return {
    sourceQueue: DLQ_SOURCE_QUEUE,
    deadQueue: DEAD_QUEUE,
    dlx: DLX_EXCHANGE,
    sourceReceived: sourceHistory.list(),
    deadReceived: deadHistory.list(),
  };
}
