import type { Channel, ConsumeMessage } from 'amqplib';

import { logger } from '../../logger.js';
import { publishToStudentExchange } from '../../rabbitmq/publisher.js';
import { createHistory } from '../shared/history.js';
import {
  PARKING_EXCHANGE,
  RETRY_SOURCE_EXCHANGE,
  RETRY_SOURCE_QUEUE,
  declareStudentRetryTopology,
  retryExchange,
  tierForRetryCount,
} from './topology.js';

interface RetryAttemptRecord {
  attempt: number;
  target: string;
  outcome: 'republished' | 'acked' | 'parking';
}

const attemptHistory = createHistory<RetryAttemptRecord>();
const processedHistory = createHistory<{ attempt: number; payload: unknown }>();

let channel: Channel | null = null;

function readRetryCount(msg: ConsumeMessage): number {
  const header = msg.properties.headers?.['x-retry-count'];
  return typeof header === 'number' ? header : Number(header ?? 0) || 0;
}

async function handleRetryMessage(ch: Channel, msg: ConsumeMessage): Promise<void> {
  const payload = JSON.parse(msg.content.toString('utf8')) as { failUntilAttempt?: number; note?: string };
  const retryCount = readRetryCount(msg);
  const failUntil = typeof payload.failUntilAttempt === 'number' ? payload.failUntilAttempt : 0;

  if (retryCount < failUntil) {
    const tier = tierForRetryCount(retryCount);
    const targetExchange = tier === 'parking' ? PARKING_EXCHANGE : retryExchange(tier);
    publishToStudentExchange(ch, targetExchange, msg.fields.routingKey || 'retry', payload, {
      headers: { ...msg.properties.headers, 'x-retry-count': retryCount + 1 },
    });
    attemptHistory.record({ attempt: retryCount, target: targetExchange, outcome: tier === 'parking' ? 'parking' : 'republished' });
    ch.ack(msg);
    logger.info({ retryCount, targetExchange }, '[rabbitmq-lab-service] retry lab republished to next tier');
    return;
  }

  processedHistory.record({ attempt: retryCount, payload });
  attemptHistory.record({ attempt: retryCount, target: RETRY_SOURCE_QUEUE, outcome: 'acked' });
  ch.ack(msg);
}

export async function initRetryLab(ch: Channel): Promise<void> {
  channel = ch;
  await declareStudentRetryTopology(ch);
  await ch.prefetch(1);
  await ch.consume(RETRY_SOURCE_QUEUE, (msg) => {
    if (!msg) return;
    void handleRetryMessage(ch, msg).catch((err) => {
      logger.error({ err }, '[rabbitmq-lab-service] retry lab handler failed');
      ch.nack(msg, false, false);
    });
  });
}

export function publishRetryJob(failUntilAttempt: number, note?: string): void {
  if (!channel) throw new Error('Retry lab is not connected yet - wait for /health/ready');
  publishToStudentExchange(
    channel,
    RETRY_SOURCE_EXCHANGE,
    'retry.job',
    { failUntilAttempt, note: note ?? 'retry lab job' },
    { headers: { 'x-retry-count': 0 } },
  );
}

export function getRetryState() {
  return {
    sourceExchange: RETRY_SOURCE_EXCHANGE,
    sourceQueue: RETRY_SOURCE_QUEUE,
    attempts: attemptHistory.list(),
    processed: processedHistory.list(),
  };
}

export function getParkingMessages() {
  return processedHistory.list();
}
