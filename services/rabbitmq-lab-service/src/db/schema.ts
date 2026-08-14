import type { Pool } from 'pg';

const SCHEMA = 'rabbitmq_lab_schema';

export async function ensureRabbitMqLabSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.lab_side_effects (
      "event_id" uuid PRIMARY KEY,
      "note" varchar(255) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.lab_orders (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "item" varchar(255) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.outbox_events (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "eventType" varchar(100) NOT NULL,
      "exchange" varchar(100) NOT NULL,
      "routingKey" varchar(150) NOT NULL,
      "aggregateType" varchar(100) NOT NULL,
      "aggregateId" uuid NOT NULL,
      "payload" jsonb NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "attempts" int NOT NULL DEFAULT 0,
      "nextRetryAt" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "publishedAt" timestamptz
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_rabbitmq_lab_outbox_status"
    ON ${SCHEMA}.outbox_events ("status")
  `);
}
