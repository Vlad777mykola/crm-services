import type { PoolClient } from 'pg';

export const CONSUMER_NAME = 'rabbitmq-lab-service';

export async function markProcessed(client: PoolClient, eventId: string): Promise<boolean> {
  const { rowCount } = await client.query(
    `INSERT INTO rabbitmq_lab_schema.processed_events ("event_id", "consumer_name") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [eventId, CONSUMER_NAME],
  );
  return rowCount === 1;
}

export async function recordSideEffect(client: PoolClient, eventId: string, note: string): Promise<void> {
  await client.query(`INSERT INTO rabbitmq_lab_schema.lab_side_effects ("event_id", "note") VALUES ($1, $2)`, [
    eventId,
    note,
  ]);
}

export async function countSideEffects(eventId: string, pool: import('pg').Pool): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM rabbitmq_lab_schema.lab_side_effects WHERE "event_id" = $1`,
    [eventId],
  );
  return Number(rows[0]?.count ?? 0);
}
