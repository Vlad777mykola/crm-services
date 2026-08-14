import type { Channel } from 'amqplib';
import type { Pool } from 'pg';

import { createLabOrder, recordOutboxEvent, LAB_OUTBOX_EXCHANGE } from '../../db/outbox-repository.js';
import { assertStudentExchange } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';

/**
 * Lesson 22 - transactional outbox in the lab schema only.
 * See docs/students/rabitmq/lab-service/18-transactional-outbox.md.
 */
export const OUTBOX_EXCHANGE = LAB_OUTBOX_EXCHANGE;
export const OUTBOX_EVENT_TYPE = studentName('order.created');

export async function declareOutboxExchange(channel: Channel): Promise<void> {
  await assertStudentExchange(channel, OUTBOX_EXCHANGE, { type: 'topic' });
}

export async function createOrderWithOutbox(pool: Pool, item: string): Promise<{ orderId: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderId = await createLabOrder(client, item);
    await recordOutboxEvent(client, {
      eventType: OUTBOX_EVENT_TYPE,
      aggregateId: orderId,
      payload: { orderId, item },
    });
    await client.query('COMMIT');
    return { orderId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getOutboxState(pool: Pool) {
  const orders = await pool.query(`SELECT "id", "item", "created_at" FROM rabbitmq_lab_schema.lab_orders ORDER BY "created_at" DESC LIMIT 20`);
  const outbox = await pool.query(
    `SELECT "id", "eventType", "status", "routingKey", "createdAt", "publishedAt"
     FROM rabbitmq_lab_schema.outbox_events ORDER BY "createdAt" DESC LIMIT 20`,
  );
  return { exchange: OUTBOX_EXCHANGE, orders: orders.rows, outbox: outbox.rows };
}
