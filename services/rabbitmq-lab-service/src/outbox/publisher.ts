import type { Channel } from 'amqplib';
import type { Pool } from 'pg';

import { logger } from '../logger.js';
import { publishToStudentExchange } from '../rabbitmq/publisher.js';

const POLL_MS = 1000;

export function startLabOutboxPublisher(pool: Pool, channel: Channel): NodeJS.Timeout {
  return setInterval(() => {
    void publishPendingOutboxRows(pool, channel).catch((err) => {
      logger.error({ err }, '[rabbitmq-lab-service] lab outbox publisher failed');
    });
  }, POLL_MS);
}

async function publishPendingOutboxRows(pool: Pool, channel: Channel): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      id: string;
      eventType: string;
      exchange: string;
      routingKey: string;
      payload: Record<string, unknown>;
    }>(
      `SELECT "id", "eventType", "exchange", "routingKey", "payload"
       FROM rabbitmq_lab_schema.outbox_events
       WHERE "status" = 'pending' AND "nextRetryAt" <= now()
       ORDER BY "createdAt"
       LIMIT 10
       FOR UPDATE SKIP LOCKED`,
    );

    for (const row of rows) {
      publishToStudentExchange(channel, row.exchange, row.routingKey, row.payload);
      await client.query(
        `UPDATE rabbitmq_lab_schema.outbox_events SET "status" = 'published', "publishedAt" = now() WHERE "id" = $1`,
        [row.id],
      );
      logger.info({ eventType: row.eventType }, '[rabbitmq-lab-service] lab outbox row published');
    }
  } finally {
    client.release();
  }
}
