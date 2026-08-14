import type { Channel } from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

import { markProcessed, recordSideEffect } from '../../db/processed-events-repository.js';
import { assertStudentQueue } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToDefaultExchange } from '../../rabbitmq/publisher.js';

/**
 * Lesson 20 - idempotency + inbox transaction (processed_events + side effect
 * in one DB transaction before ACK). See
 * docs/students/rabitmq/lab-service/17-idempotency.md.
 */
export const IDEMPOTENCY_QUEUE = studentName('idempotency.q');

export interface IdempotencyEvent {
  eventId: string;
  note: string;
  /** Test hook: throw after processed_events insert to verify rollback. */
  failAfterMark?: boolean;
}

let channel: Channel | null = null;
let pool: Pool | null = null;

export async function initIdempotencyLab(ch: Channel, db: Pool): Promise<void> {
  channel = ch;
  pool = db;
  await assertStudentQueue(ch, IDEMPOTENCY_QUEUE, { durable: true });
  await ch.prefetch(1);
  await ch.consume(IDEMPOTENCY_QUEUE, (msg) => {
    if (!msg) return;
    void processIdempotencyMessage(ch, msg).catch(() => {
      ch.nack(msg, false, false);
    });
  });
}

async function processIdempotencyMessage(ch: Channel, msg: import('amqplib').ConsumeMessage): Promise<void> {
  if (!pool) throw new Error('idempotency lab DB not ready');
  const event = JSON.parse(msg.content.toString('utf8')) as IdempotencyEvent;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const isNew = await markProcessed(client, event.eventId);
    if (!isNew) {
      await client.query('COMMIT');
      ch.ack(msg);
      return;
    }
    if (event.failAfterMark) {
      throw new Error('simulated handler failure after processed_events insert');
    }
    await recordSideEffect(client, event.eventId, event.note);
    await client.query('COMMIT');
    ch.ack(msg);
  } catch {
    await client.query('ROLLBACK');
    ch.nack(msg, false, false);
  } finally {
    client.release();
  }
}

export function publishIdempotencyEvent(event: IdempotencyEvent): void {
  if (!channel) throw new Error('Idempotency lab is not connected yet - wait for /health/ready');
  publishToDefaultExchange(channel, IDEMPOTENCY_QUEUE, event);
}

export function createTestIdempotencyEvent(note: string, failAfterMark = false): IdempotencyEvent {
  return { eventId: randomUUID(), note, failAfterMark };
}

export async function getIdempotencyState(db: Pool) {
  const { rows } = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM rabbitmq_lab_schema.processed_events WHERE "consumer_name" = 'rabbitmq-lab-service'`,
  );
  const sideEffects = await db.query(`SELECT "event_id", "note", "created_at" FROM rabbitmq_lab_schema.lab_side_effects ORDER BY "created_at" DESC LIMIT 20`);
  return {
    queue: IDEMPOTENCY_QUEUE,
    processedCount: Number(rows[0]?.count ?? 0),
    sideEffects: sideEffects.rows,
  };
}
