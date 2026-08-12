import type { Pool } from 'pg';

/**
 * Creates appointments_schema - see
 * docs/architecture/microservices-extraction-checklist.md Phase 9 Task 9.3/9.4.
 * No backfill. `appointment_status_history` is a brand-new table (no
 * existing table to rename, per shared-polymorphic-table-audit.md).
 *
 * The four `*_projection` tables are Task 9.3's "local projections (no
 * cross-schema SQL)" - each is fed exclusively by events from the service
 * that owns the real data (company.*, company-member.*, service.*,
 * specialist-service.*), never by direct cross-schema reads.
 *
 * `hasReview` (a legacy response-enrichment field, not a real column) is not
 * backed by a projection here: `review.received.v1.json` does not carry
 * `appointmentId`, so there's nothing to key a projection on without changing
 * that contract, which is out of scope for this phase. See README "Known
 * gaps".
 */
export async function ensureAppointmentsSchema(pool: Pool): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS appointments_schema`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointments (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid,
      "clientUserId" uuid NOT NULL,
      "requestedStartAt" timestamptz NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "notes" text,
      "respondedAt" timestamptz,
      "completedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId" ON appointments_schema.appointments ("companyId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_serviceId" ON appointments_schema.appointments ("serviceId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_clientUserId" ON appointments_schema.appointments ("clientUserId")`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_status_history (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "appointmentId" uuid NOT NULL REFERENCES appointments_schema.appointments ("id") ON DELETE CASCADE,
      "fromStatus" varchar(50),
      "toStatus" varchar(50) NOT NULL,
      "changedByUserId" uuid,
      "reason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointment_status_history_appointmentId" ON appointments_schema.appointment_status_history ("appointmentId")`);

  // Fed by company-member.added/.removed (company-members-service).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_membership_projection (
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "userId")
    )
  `);

  // Fed by company.created/.updated (companies-service).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_company_projection (
      "companyId" uuid PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Fed by service.created/.updated (services-catalog-service).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_projection (
      "serviceId" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "status" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Fed by specialist-service.assigned/.removed (services-catalog-service) -
  // used to validate a client's preferred specialist is actually assigned to
  // the requested service.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_specialist_projection (
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("serviceId", "specialistProfileId")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.outbox_events (
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
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_status" ON appointments_schema.outbox_events ("status")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_nextRetryAt" ON appointments_schema.outbox_events ("nextRetryAt")`);
}
