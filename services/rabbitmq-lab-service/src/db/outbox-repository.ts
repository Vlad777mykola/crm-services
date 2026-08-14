import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import { studentName } from '../rabbitmq/names.js';

export const LAB_OUTBOX_EXCHANGE = studentName('outbox');

export interface RecordOutboxInput {
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export async function recordOutboxEvent(client: PoolClient, input: RecordOutboxInput): Promise<void> {
  await client.query(
    `INSERT INTO rabbitmq_lab_schema.outbox_events
       ("eventType", "exchange", "routingKey", "aggregateType", "aggregateId", "payload")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.eventType, LAB_OUTBOX_EXCHANGE, input.eventType, 'lab_order', input.aggregateId, input.payload],
  );
}

export async function createLabOrder(client: PoolClient, item: string): Promise<string> {
  const id = randomUUID();
  await client.query(`INSERT INTO rabbitmq_lab_schema.lab_orders ("id", "item") VALUES ($1, $2)`, [id, item]);
  return id;
}
