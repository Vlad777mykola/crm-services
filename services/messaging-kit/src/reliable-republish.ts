import type { Channel, ConsumeMessage } from 'amqplib';

import { classifyError } from './errors.js';
import {
  MAX_RETRY_ATTEMPTS,
  parkingExchangeName,
  retryExchangeName,
  tierForAttempt,
  type RetryTopologyOptions,
} from './retry.js';

export interface ReliableRepublishResult {
  ok: boolean;
  targetExchange: string;
}

function readRetryCount(msg: ConsumeMessage): number {
  const header = msg.properties.headers?.['x-retry-count'];
  return typeof header === 'number' ? header : Number(header ?? 0) || 0;
}

export async function reliableRepublish(
  channel: Channel,
  msg: ConsumeMessage,
  options: RetryTopologyOptions,
  error: unknown,
): Promise<ReliableRepublishResult> {
  const failureReason = error instanceof Error ? error.message : String(error);
  const retryCount = readRetryCount(msg);
  const category = classifyError(error);
  const exhausted = retryCount >= MAX_RETRY_ATTEMPTS;
  const permanent = category === 'permanent' || category === 'validation';

  const tier = permanent || exhausted ? 'parking' : tierForAttempt(retryCount);
  const targetExchange =
    tier === 'parking'
      ? parkingExchangeName(options.serviceName, options.sourceExchange)
      : retryExchangeName(options.serviceName, options.sourceExchange, tier);

  const now = new Date().toISOString();
  const headers = {
    ...(msg.properties.headers ?? {}),
    'x-retry-count': permanent || exhausted ? retryCount : retryCount + 1,
    'x-original-exchange': msg.fields.exchange,
    'x-original-routing-key': msg.fields.routingKey,
    'x-first-failure-at': (msg.properties.headers?.['x-first-failure-at'] as string | undefined) ?? now,
    'x-last-failure-at': now,
    'x-failure-reason': failureReason,
  };

  const published = channel.publish(targetExchange, msg.fields.routingKey, msg.content, {
    contentType: msg.properties.contentType ?? 'application/json',
    persistent: true,
    mandatory: true,
    messageId: msg.properties.messageId,
    correlationId: msg.properties.correlationId,
    headers,
  });

  return { ok: published, targetExchange };
}

export async function handleConsumerFailure(
  channel: Channel,
  msg: ConsumeMessage,
  serviceName: string,
  error: unknown,
): Promise<'acked' | 'channel_closed'> {
  const sourceExchange = msg.fields.exchange === 'analytics.events' ? 'analytics.events' : 'domain.events';
  const republish = await reliableRepublish(channel, msg, { serviceName, sourceExchange }, error);
  if (republish.ok) {
    channel.ack(msg);
    return 'acked';
  }
  await channel.close().catch(() => {});
  return 'channel_closed';
}
