import type { Pool } from 'pg';

/**
 * Creates reviews_schema - see docs/architecture/microservices-extraction-checklist.md
 * Phase 10 Task 10.3. No backfill: starts empty.
 */
export async function ensureReviewsSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS reviews_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews_schema.reviews (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "appointmentId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid,
      "clientUserId" uuid NOT NULL,
      "rating" smallint NOT NULL,
      "comment" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reviews_appointmentId" ON reviews_schema.reviews ("appointmentId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_companyId" ON reviews_schema.reviews ("companyId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_serviceId" ON reviews_schema.reviews ("serviceId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_specialistProfileId" ON reviews_schema.reviews ("specialistProfileId")`);

  // Not used yet - no consumer exists in this phase. Reserved for consistency
  // with every other service's schema.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews_schema.outbox_events (
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
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_outbox_events_status" ON reviews_schema.outbox_events ("status")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_outbox_events_nextRetryAt" ON reviews_schema.outbox_events ("nextRetryAt")`);
}
