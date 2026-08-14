import type { Channel } from 'amqplib';

import { assertStudentExchange, assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';
import { env } from '../../env.js';

/** Production-style labels; TTL values come from env (shorter in tests). */
export const RETRY_TIER_LABELS = ['5s', '30s', '5m'] as const;
export type RetryTierLabel = (typeof RETRY_TIER_LABELS)[number];

export const RETRY_SOURCE_EXCHANGE = studentName('retry.source');
export const RETRY_SOURCE_QUEUE = studentName('retry.source.q');
export const PARKING_EXCHANGE = studentName('parking.exchange');
export const PARKING_QUEUE = studentName('parking.q');

export function retryExchange(label: RetryTierLabel): string {
  return studentName('retry', label, 'exchange');
}

export function retryQueue(label: RetryTierLabel): string {
  return studentName('retry', label, 'q');
}

function tierTtlMs(label: RetryTierLabel): number {
  if (label === '5s') return env.RETRY_TIER_1_MS;
  if (label === '30s') return env.RETRY_TIER_2_MS;
  return env.RETRY_TIER_3_MS;
}

export async function declareStudentRetryTopology(channel: Channel): Promise<void> {
  await assertStudentExchange(channel, RETRY_SOURCE_EXCHANGE, { type: 'topic' });
  await assertStudentQueue(channel, RETRY_SOURCE_QUEUE, { durable: true });
  await bindStudentQueue(channel, RETRY_SOURCE_QUEUE, RETRY_SOURCE_EXCHANGE, '#');

  for (const label of RETRY_TIER_LABELS) {
    const exchange = retryExchange(label);
    const queue = retryQueue(label);
    await assertStudentExchange(channel, exchange, { type: 'topic' });
    await assertStudentQueue(channel, queue, {
      durable: true,
      arguments: {
        'x-message-ttl': tierTtlMs(label),
        'x-dead-letter-exchange': RETRY_SOURCE_EXCHANGE,
      },
    });
    await bindStudentQueue(channel, queue, exchange, '#');
  }

  await assertStudentExchange(channel, PARKING_EXCHANGE, { type: 'topic' });
  await assertStudentQueue(channel, PARKING_QUEUE, { durable: true });
  await bindStudentQueue(channel, PARKING_QUEUE, PARKING_EXCHANGE, '#');
}

export function tierForRetryCount(retryCount: number): RetryTierLabel | 'parking' {
  if (retryCount <= 0) return '5s';
  if (retryCount === 1) return '30s';
  if (retryCount === 2) return '5m';
  return 'parking';
}
