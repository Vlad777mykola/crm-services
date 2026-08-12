import type { Pool } from 'pg';

/**
 * Creates auth_schema and every table this service owns if they don't already
 * exist - see docs/architecture/table-ownership-matrix.md ("Create auth_schema
 * with auth_identities, auth_sessions, auth_membership_projection,
 * processed_events, outbox_events", Phase 2 Task 2.2). Every statement is
 * idempotent, so this is safe to run on every startup. No backfill: every
 * table starts empty (existing legacy accounts are discarded, per user
 * direction).
 *
 * `auth_identities.id` is the canonical userId used everywhere in this
 * service (JWT `sub` claim, `auth.user_registered` payload) - there is no
 * separate "users" table here anymore; profile fields live in users-service's
 * own schema (users_schema), not this one.
 */
export async function ensureAuthSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS auth_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema.auth_identities (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "provider" varchar(50) NOT NULL,
      "providerUserId" varchar(255) NOT NULL,
      "email" varchar(255),
      "passwordHash" varchar(255),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_auth_identities_provider_provider_user_id" UNIQUE ("provider", "providerUserId")
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_auth_identities_email" ON auth_schema.auth_identities ("email")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema.auth_sessions (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL REFERENCES auth_schema.auth_identities ("id") ON DELETE CASCADE,
      "refreshTokenHash" varchar(255) NOT NULL UNIQUE,
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "userAgent" varchar(512),
      "ipAddress" varchar(64),
      "expiresAt" timestamptz NOT NULL,
      "revokedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_auth_sessions_userId" ON auth_schema.auth_sessions ("userId")
  `);

  // Empty until Phase 5 (company-member.* consumer) - shape is a placeholder,
  // not a confirmed contract; Phase 5 may ALTER it once the events it's built
  // from are finalized. No data migration either way (no backfill policy).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema.auth_membership_projection (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "role" varchar(50) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Not consumed from yet in Phase 2 - reserved ahead of Phase 5, per Task 2.2.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  // Matches backend/src/infrastructure/outbox/outbox-event.entity.ts exactly
  // so the existing services/outbox-publisher image can be redeployed
  // unmodified against this table (Q8) - see service-port-registry.md.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_schema.outbox_events (
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
    CREATE INDEX IF NOT EXISTS "IDX_auth_outbox_events_eventType" ON auth_schema.outbox_events ("eventType")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_auth_outbox_events_status" ON auth_schema.outbox_events ("status")
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_auth_outbox_events_nextRetryAt" ON auth_schema.outbox_events ("nextRetryAt")
  `);
}
