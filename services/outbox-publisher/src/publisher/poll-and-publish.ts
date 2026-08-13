import { randomUUID } from 'node:crypto';

import type { OutboxRepository, OutboxRow } from '../db/outbox-repository.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import type { PublishResult, RabbitMqPublisher } from '../rabbitmq/publisher.js';

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
    correlationId: row.correlationId ?? randomUUID(),
    causationId: row.causationId ?? null,
    data: row.payload,
  };
}

function shouldIncrementAttempts(result: PublishResult): boolean {
  return result.failureClass === 'confirm_nack' || result.failureClass === 'unroutable';
}

/** Publishes one batch of claimed outbox rows. Returns how many rows were processed. */
export async function publishPendingBatch(repository: OutboxRepository, publisher: RabbitMqPublisher): Promise<number> {
  if (!publisher.isReady()) {
    return 0;
  }

  const rows = await repository.claimPending(env.BATCH_SIZE);

  for (const row of rows) {
    try {
      const body = Buffer.from(JSON.stringify(toWireEnvelope(row)));
      const result = await publisher.publishConfirmed(row.id, row.exchange, row.routingKey, body);

      if (result.ok) {
        try {
          await repository.markPublished(row.id);
          logger.info({ eventId: row.id, eventType: row.eventType }, '[outbox-publisher] published event');
        } catch (err) {
          await repository.releaseLease(row.id);
          logger.error({ err, eventId: row.id }, '[outbox-publisher] broker accepted message but DB mark failed — lease released for retry');
        }
        continue;
      }

      if (result.failureClass === 'connection_unavailable') {
        await repository.releaseLease(row.id);
        logger.warn({ eventId: row.id }, '[outbox-publisher] infrastructure failure — lease released without incrementing attempts');
        continue;
      }

      if (shouldIncrementAttempts(result)) {
        const attempts = row.attempts + 1;
        const nextRetryAt = new Date(Date.now() + computeBackoffMs(attempts));
        await repository.markFailedAttempt(row.id, attempts, nextRetryAt, env.MAX_ATTEMPTS);
        logger.error({ eventId: row.id, attempts, failureClass: result.failureClass }, '[outbox-publisher] delivery failure — will retry');
      } else {
        await repository.releaseLease(row.id);
      }
    } catch (err) {
      await repository.releaseLease(row.id);
      logger.error({ err, eventId: row.id }, '[outbox-publisher] unexpected publish error — lease released without attempt burn');
    }
  }

  return rows.length;
}
