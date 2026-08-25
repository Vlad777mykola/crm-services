import type { DataSource } from 'typeorm';

/**
 * Creates company_members_schema - see
 * docs/architecture/microservices-extraction-checklist.md Phase 5 Task 5.2.
 * No backfill: starts empty. `member_invitations` is reserved but unused -
 * legacy's real invite flow has no pending-invitation concept (it immediately
 * creates an active `manager` membership if a user with that email exists),
 * so this service preserves that exact behavior rather than inventing a new
 * pending-invite flow (no new functionality without approval).
 */
export async function ensureCompanyMembersSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS company_members_schema`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_members_schema.company_members (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" varchar(20) NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_company_members_company_user" UNIQUE ("companyId", "userId")
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_members_companyId" ON company_members_schema.company_members ("companyId")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_members_userId" ON company_members_schema.company_members ("userId")
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_members_schema.member_invitations (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "email" varchar(255) NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_members_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS company_members_schema.outbox_events (
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
    ALTER TABLE company_members_schema.outbox_events
      ADD COLUMN IF NOT EXISTS "correlationId" text,
      ADD COLUMN IF NOT EXISTS "causationId" text
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_members_outbox_events_status" ON company_members_schema.outbox_events ("status")
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_members_outbox_events_nextRetryAt" ON company_members_schema.outbox_events ("nextRetryAt")
  `);
}
