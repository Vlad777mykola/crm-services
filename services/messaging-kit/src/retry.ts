import type { Channel } from 'amqplib';

export const RETRY_TIERS_MS = [5_000, 30_000, 300_000] as const;
export const MAX_RETRY_ATTEMPTS = RETRY_TIERS_MS.length;

export interface RetryTopologyOptions {
  serviceName: string;
  sourceExchange: 'domain.events' | 'analytics.events';
}

export function retryExchangeName(serviceName: string, sourceExchange: string, tierLabel: string): string {
  const source = sourceExchange === 'domain.events' ? 'domain' : 'analytics';
  return `${serviceName}.${source}.retry.${tierLabel}.exchange`;
}

export function retryQueueName(serviceName: string, sourceExchange: string, tierLabel: string): string {
  const source = sourceExchange === 'domain.events' ? 'domain' : 'analytics';
  return `${serviceName}.${source}.retry.${tierLabel}.q`;
}

export function parkingExchangeName(serviceName: string, sourceExchange: string): string {
  const source = sourceExchange === 'domain.events' ? 'domain' : 'analytics';
  return `${serviceName}.${source}.parking.exchange`;
}

export function parkingQueueName(serviceName: string, sourceExchange: string): string {
  const source = sourceExchange === 'domain.events' ? 'domain' : 'analytics';
  return `${serviceName}.${source}.parking.q`;
}

export async function declareRetryTopology(channel: Channel, options: RetryTopologyOptions): Promise<void> {
  const tiers: Array<{ label: string; ttlMs: number }> = [
    { label: '5s', ttlMs: 5_000 },
    { label: '30s', ttlMs: 30_000 },
    { label: '5m', ttlMs: 300_000 },
  ];

  for (const tier of tiers) {
    const exchange = retryExchangeName(options.serviceName, options.sourceExchange, tier.label);
    const queue = retryQueueName(options.serviceName, options.sourceExchange, tier.label);
    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-message-ttl': tier.ttlMs,
        'x-dead-letter-exchange': options.sourceExchange,
      },
    });
    await channel.bindQueue(queue, exchange, '#');
  }

  const parkingExchange = parkingExchangeName(options.serviceName, options.sourceExchange);
  const parkingQueue = parkingQueueName(options.serviceName, options.sourceExchange);
  await channel.assertExchange(parkingExchange, 'topic', { durable: true });
  await channel.assertQueue(parkingQueue, { durable: true });
  await channel.bindQueue(parkingQueue, parkingExchange, '#');
}

export function tierForAttempt(retryCount: number): '5s' | '30s' | '5m' | 'parking' {
  if (retryCount <= 0) return '5s';
  if (retryCount === 1) return '30s';
  if (retryCount === 2) return '5m';
  return 'parking';
}
