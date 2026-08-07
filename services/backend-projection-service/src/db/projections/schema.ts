import type { Pool } from 'pg';

/**
 * Creates this service's own projection tables in the main database if they
 * don't already exist. These are the only tables in main-postgres this
 * service ever writes to - see docs/architecture/service-ownership.md. Every
 * statement is idempotent, so this is safe to run on every startup.
 */
export async function ensureProjectionTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "appointment_recommendation_projections" (
      "id" uuid PRIMARY KEY,
      "appointmentId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "summary" text NOT NULL,
      "confidence" numeric(3, 2) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_appointment_recommendation_projections_appointmentId"
      ON "appointment_recommendation_projections" ("appointmentId")
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "company_insight_projections" (
      "id" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "insightType" varchar(100) NOT NULL,
      "summary" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_insight_projections_companyId"
      ON "company_insight_projections" ("companyId")
  `);
}
