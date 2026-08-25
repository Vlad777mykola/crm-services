import type { DataSource } from 'typeorm';

/**
 * Creates company_specialists_schema - see
 * docs/architecture/microservices-extraction-checklist.md Phase 7 Task 7.2.
 * No backfill: starts empty.
 */
export async function ensureCompanySpecialistsSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS company_specialists_schema`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_specialists_schema.company_specialist_requests (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "requestedByUserId" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "message" text,
      "respondedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_csr_companyId" ON company_specialists_schema.company_specialist_requests ("companyId")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_csr_specialistProfileId" ON company_specialists_schema.company_specialist_requests ("specialistProfileId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_specialists_schema.company_specialists (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "startedAt" timestamptz NOT NULL DEFAULT now(),
      "endedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_company_specialists_company_specialist" UNIQUE ("companyId", "specialistProfileId")
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_cs_companyId" ON company_specialists_schema.company_specialists ("companyId")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_cs_specialistProfileId" ON company_specialists_schema.company_specialists ("specialistProfileId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_specialists_schema.company_membership_projection (
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" text NOT NULL,
      "status" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "userId")
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_specialists_membership_projection_userId"
    ON company_specialists_schema.company_membership_projection ("userId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_specialists_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_specialists_schema.outbox_events (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "eventType" varchar(100) NOT NULL,
      "exchange" varchar(100) NOT NULL,
      "routingKey" varchar(150) NOT NULL,
      "aggregateType" varchar(100) NOT NULL,
      "aggregateId" uuid NOT NULL,
      "payload" jsonb NOT NULL,
      "correlationId" text,
      "causationId" text,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "attempts" int NOT NULL DEFAULT 0,
      "nextRetryAt" timestamptz NOT NULL DEFAULT now(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "publishedAt" timestamptz
    )
  `);
  await dataSource.query(`
    ALTER TABLE company_specialists_schema.outbox_events
      ADD COLUMN IF NOT EXISTS "correlationId" text,
      ADD COLUMN IF NOT EXISTS "causationId" text
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_cs_outbox_events_status" ON company_specialists_schema.outbox_events ("status")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_cs_outbox_events_nextRetryAt" ON company_specialists_schema.outbox_events ("nextRetryAt")
  `);
}
