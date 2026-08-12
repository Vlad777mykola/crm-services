import type { Pool } from 'pg';

/**
 * Creates companies_schema and every table this service owns - see
 * docs/architecture/microservices-extraction-checklist.md Phase 4 Task 4.2.
 * No backfill: starts empty. `company_status_history` is a brand-new,
 * per-domain table (per shared-polymorphic-table-audit.md) - this service
 * never writes to legacy's shared `status_history_entries`.
 */
export async function ensureCompaniesSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS companies_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies_schema.companies (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "description" text,
      "category" varchar(100),
      "website" varchar(255),
      "phone" varchar(30),
      "email" varchar(255),
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "isRemoteSupported" boolean NOT NULL DEFAULT false,
      "city" varchar(255),
      "address" varchar(255),
      "createdByUserId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_companies_createdByUserId" ON companies_schema.companies ("createdByUserId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies_schema.company_status_history (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL REFERENCES companies_schema.companies ("id") ON DELETE CASCADE,
      "fromStatus" varchar(50),
      "toStatus" varchar(50) NOT NULL,
      "changedByUserId" uuid,
      "reason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_status_history_companyId" ON companies_schema.company_status_history ("companyId")
  `);

  // AI-derived, not a source-of-truth table - moved here from
  // backend-projection-service in Phase 12 (see table-ownership-matrix.md).
  // Fed by ai.company_insight_created (ai-service, analytics.events
  // exchange). Safe to drop and rebuild; no backfill from the old table.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies_schema.company_insight_projections (
      "id" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "insightType" varchar(100) NOT NULL,
      "summary" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_insight_projections_companyId" ON companies_schema.company_insight_projections ("companyId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies_schema.outbox_events (
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
    CREATE INDEX IF NOT EXISTS "IDX_companies_outbox_events_eventType" ON companies_schema.outbox_events ("eventType")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_companies_outbox_events_status" ON companies_schema.outbox_events ("status")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_companies_outbox_events_nextRetryAt" ON companies_schema.outbox_events ("nextRetryAt")
  `);
}
