import type { Pool } from 'pg';

/**
 * Creates services_schema - see
 * docs/architecture/microservices-extraction-checklist.md Phase 8 Task 8.3.
 * No backfill. Real table names only - `services`, `service_specialists` -
 * not `company_services`/`specialist_company_services` (neither ever
 * existed, see docs/architecture/table-ownership-matrix.md).
 * `service_status_history` is a brand-new, per-domain table (per
 * shared-polymorphic-table-audit.md).
 */
export async function ensureServicesSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS services_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services_schema.services (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "category" varchar(100),
      "durationMinutes" int NOT NULL,
      "price" numeric(10,2),
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_services_companyId" ON services_schema.services ("companyId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services_schema.service_specialists (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "serviceId" uuid NOT NULL REFERENCES services_schema.services ("id") ON DELETE CASCADE,
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_service_specialists_service_specialist" UNIQUE ("serviceId", "specialistProfileId")
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_service_specialists_serviceId" ON services_schema.service_specialists ("serviceId")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_service_specialists_specialistProfileId" ON services_schema.service_specialists ("specialistProfileId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services_schema.service_status_history (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "serviceId" uuid NOT NULL REFERENCES services_schema.services ("id") ON DELETE CASCADE,
      "fromStatus" varchar(50),
      "toStatus" varchar(50) NOT NULL,
      "changedByUserId" uuid,
      "reason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_service_status_history_serviceId" ON services_schema.service_status_history ("serviceId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services_schema.outbox_events (
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
    CREATE INDEX IF NOT EXISTS "IDX_services_outbox_events_status" ON services_schema.outbox_events ("status")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_services_outbox_events_nextRetryAt" ON services_schema.outbox_events ("nextRetryAt")
  `);
}
