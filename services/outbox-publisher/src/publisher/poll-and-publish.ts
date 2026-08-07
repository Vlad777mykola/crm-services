import { randomUUID } from 'node:crypto';

import type { OutboxRepository, OutboxRow } from '../db/outbox-repository.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import type { RabbitMqPublisher } from '../rabbitmq/publisher.js';

/** Exponential backoff capped at 60s: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ... */
export function computeBackoffMs(attempts: number): number {
  return Math.min(1000 * 2 ** attempts, 60_000);
}

function toWireEnvelope(row: OutboxRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.eventType,
    source: 'outbox-publisher',
    version: '1.0',
    time: row.createdAt.toISOString(),
    correlationId: randomUUID(),
    data: row.payload,
  };
}

/** Publishes one batch of pending outbox rows. Returns how many rows were processed. */
export async function publishPendingBatch(repository: OutboxRepository, publisher: RabbitMqPublisher): Promise<number> {
  const rows = await repository.findPending(env.BATCH_SIZE);

  for (const row of rows) {
    try {
      publisher.publish(row.exchange, row.routingKey, Buffer.from(JSON.stringify(toWireEnvelope(row))));
      await repository.markPublished(row.id);
      logger.info({ eventId: row.id, eventType: row.eventType }, '[outbox-publisher] published event');
    } catch (err) {
      const attempts = row.attempts + 1;
      const nextRetryAt = new Date(Date.now() + computeBackoffMs(attempts));
      await repository.markFailedAttempt(row.id, attempts, nextRetryAt, env.MAX_ATTEMPTS);
      logger.error({ err, eventId: row.id, attempts }, '[outbox-publisher] failed to publish event - will retry');
    }
  }

  return rows.length;
}
