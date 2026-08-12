import type { Pool } from 'pg';

/**
 * Creates notifications_schema - see
 * docs/architecture/microservices-extraction-checklist.md Phase 11 Task 11.2.
 * No backfill: `notifications` and `email_logs` move from the shared/public
 * schema (where they previously lived, written only by this service and read
 * by legacy's HTTP API) into their own schema, starting empty.
 */
export async function ensureNotificationsSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS notifications_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications_schema.notifications (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "type" varchar(100) NOT NULL,
      "title" varchar(255) NOT NULL,
      "body" text,
      "metadata" jsonb,
      "isRead" boolean NOT NULL DEFAULT false,
      "readAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON notifications_schema.notifications ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_isRead" ON notifications_schema.notifications ("isRead")`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications_schema.email_logs (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "toEmail" varchar(255) NOT NULL,
      "subject" varchar(255) NOT NULL,
      "body" text NOT NULL,
      "eventType" varchar(100) NOT NULL,
      "eventId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);
}
