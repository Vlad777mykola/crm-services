import type { Pool } from 'pg';

/**
 * Creates users_schema and every table this service owns if they don't
 * already exist - see docs/architecture/table-ownership-matrix.md and
 * Phase 2 Task 2.5. No backfill: every table starts empty (legacy `users`
 * rows are discarded, per user direction).
 *
 * `users.id` always equals the `userId` from the `auth.user_registered`
 * event payload (== `auth_schema.auth_identities.id` in auth-service) - this
 * service never queries auth-service's schema directly, only reacts to its
 * events.
 */
export async function ensureUsersSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS users_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_schema.users (
      "id" uuid PRIMARY KEY,
      "email" varchar(255),
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_schema.user_profiles (
      "userId" uuid PRIMARY KEY REFERENCES users_schema.users ("id") ON DELETE CASCADE,
      "name" varchar(255) NOT NULL,
      "phone" varchar(30),
      "city" varchar(255),
      "bio" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  // Not used yet in Phase 2 (this service doesn't publish until Phase 3's
  // user.profile_created/updated, if confirmed - see event-catalog.md).
  // Reserved now per Task 2.5.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_schema.outbox_events (
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
}
