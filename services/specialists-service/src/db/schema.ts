import type { Pool } from 'pg';

/** See docs/architecture/microservices-extraction-checklist.md Phase 6 Task 6.2. No backfill. */
export async function ensureSpecialistsSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS specialists_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.specialist_profiles (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL UNIQUE,
      "displayName" varchar(255) NOT NULL,
      "headline" varchar(255),
      "bio" text,
      "category" varchar(100),
      "city" varchar(255),
      "isRemoteSupported" boolean NOT NULL DEFAULT false,
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.specialist_status_history (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "specialistProfileId" uuid NOT NULL REFERENCES specialists_schema.specialist_profiles ("id") ON DELETE CASCADE,
      "fromStatus" varchar(50),
      "toStatus" varchar(50) NOT NULL,
      "changedByUserId" uuid,
      "reason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_specialist_status_history_profileId" ON specialists_schema.specialist_status_history ("specialistProfileId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.outbox_events (
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
    CREATE INDEX IF NOT EXISTS "IDX_specialists_outbox_events_status" ON specialists_schema.outbox_events ("status")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_specialists_outbox_events_nextRetryAt" ON specialists_schema.outbox_events ("nextRetryAt")
  `);
}
