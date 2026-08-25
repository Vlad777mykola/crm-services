import type { DataSource } from 'typeorm';

/** See docs/architecture/microservices-extraction-checklist.md Phase 6 Task 6.2. No backfill. */
export async function ensureSpecialistsSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS specialists_schema`);

  await dataSource.query(`
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

  await dataSource.query(`
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
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_specialist_status_history_profileId" ON specialists_schema.specialist_status_history ("specialistProfileId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.public_company_projection (
      "companyId" uuid PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "slug" varchar(255),
      "status" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.public_specialist_company_projection (
      "specialistProfileId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("specialistProfileId", "companyId")
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_public_specialist_company_companyId"
    ON specialists_schema.public_specialist_company_projection ("companyId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.public_service_projection (
      "serviceId" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "status" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_public_service_projection_companyId"
    ON specialists_schema.public_service_projection ("companyId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.public_specialist_service_projection (
      "serviceId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("serviceId", "specialistProfileId")
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_public_specialist_service_companyId"
    ON specialists_schema.public_specialist_service_projection ("companyId")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_public_specialist_service_specialistProfileId"
    ON specialists_schema.public_specialist_service_projection ("specialistProfileId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.public_specialist_rating_summary (
      "specialistProfileId" uuid PRIMARY KEY,
      "ratingSum" int NOT NULL DEFAULT 0,
      "reviewsCount" int NOT NULL DEFAULT 0,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS specialists_schema.outbox_events (
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
    ALTER TABLE specialists_schema.outbox_events
      ADD COLUMN IF NOT EXISTS "correlationId" text,
      ADD COLUMN IF NOT EXISTS "causationId" text
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_specialists_outbox_events_status" ON specialists_schema.outbox_events ("status")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_specialists_outbox_events_nextRetryAt" ON specialists_schema.outbox_events ("nextRetryAt")
  `);
}
