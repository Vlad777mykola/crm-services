import type { DataSource } from 'typeorm';

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
export async function ensureAppointmentsSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS appointments_schema`);
  await dataSource.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointments (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid,
      "clientUserId" uuid NOT NULL,
      "requestedStartAt" timestamptz NOT NULL,
      "startAt" timestamptz NOT NULL,
      "endAt" timestamptz NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "createdByUserId" uuid,
      "notes" text,
      "respondedAt" timestamptz,
      "completedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "startAt" timestamptz`);
  await dataSource.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "endAt" timestamptz`);
  await dataSource.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "createdByUserId" uuid`);
  await dataSource.query(`UPDATE appointments_schema.appointments SET "startAt" = COALESCE("startAt", "requestedStartAt") WHERE "startAt" IS NULL`);
  await dataSource.query(`UPDATE appointments_schema.appointments SET "endAt" = COALESCE("endAt", "requestedStartAt" + interval '60 minutes') WHERE "endAt" IS NULL`);
  await dataSource.query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "startAt" SET NOT NULL`);
  await dataSource.query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "endAt" SET NOT NULL`);
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'appointments_time_order'
          AND conrelid = 'appointments_schema.appointments'::regclass
      ) THEN
        ALTER TABLE appointments_schema.appointments
          ADD CONSTRAINT appointments_time_order CHECK ("startAt" < "endAt");
      END IF;
    END $$;
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId" ON appointments_schema.appointments ("companyId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_serviceId" ON appointments_schema.appointments ("serviceId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_clientUserId" ON appointments_schema.appointments ("clientUserId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_specialistProfileId" ON appointments_schema.appointments ("specialistProfileId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_startAt" ON appointments_schema.appointments ("startAt")`);
  // Composite indexes for the persona list views (company/client/specialist),
  // which always filter by status alongside the owning id.
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId_status" ON appointments_schema.appointments ("companyId", "status")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_clientUserId_status" ON appointments_schema.appointments ("clientUserId", "status")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_specialistProfileId_status" ON appointments_schema.appointments ("specialistProfileId", "status")`);
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'appointments_no_specialist_overlap'
          AND conrelid = 'appointments_schema.appointments'::regclass
      ) THEN
        ALTER TABLE appointments_schema.appointments
          ADD CONSTRAINT appointments_no_specialist_overlap
          EXCLUDE USING gist (
            "specialistProfileId" WITH =,
            tstzrange("startAt", "endAt", '[)') WITH &&
          )
          WHERE ("specialistProfileId" IS NOT NULL AND "status" IN ('pending', 'approved'));
      END IF;
    END $$;
  `);

  await dataSource.query(`
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
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointment_status_history_appointmentId" ON appointments_schema.appointment_status_history ("appointmentId")`);

  // Fed by company-member.added/.removed (company-members-service).
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_membership_projection (
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "userId")
    )
  `);

  // Fed by company.created/.updated (companies-service).
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_company_projection (
      "companyId" uuid PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Fed by service.created/.updated (services-catalog-service).
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_projection (
      "serviceId" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "status" varchar(20) NOT NULL,
      "durationMinutes" int NOT NULL DEFAULT 60,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`ALTER TABLE appointments_schema.appointment_service_projection ADD COLUMN IF NOT EXISTS "durationMinutes" int NOT NULL DEFAULT 60`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.company_availability_rules (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "weekday" smallint NOT NULL,
      "startTime" time NOT NULL,
      "endTime" time NOT NULL,
      "timezone" varchar(100) NOT NULL DEFAULT 'UTC',
      "active" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_company_availability_weekday" CHECK ("weekday" BETWEEN 0 AND 6),
      CONSTRAINT "CHK_company_availability_time_order" CHECK ("startTime" < "endTime")
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_company_availability_rules_companyId" ON appointments_schema.company_availability_rules ("companyId")`);
  await dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_company_availability_rules_active_window" ON appointments_schema.company_availability_rules ("companyId", "weekday", "startTime", "endTime", "timezone") WHERE "active" = true`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.company_time_blocks (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "reason" text,
      "createdByUserId" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_company_time_blocks_time_order" CHECK ("startsAt" < "endsAt")
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_company_time_blocks_company_range" ON appointments_schema.company_time_blocks ("companyId", "startsAt", "endsAt")`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.specialist_availability_rules (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "weekday" smallint NOT NULL,
      "startTime" time NOT NULL,
      "endTime" time NOT NULL,
      "timezone" varchar(100) NOT NULL DEFAULT 'UTC',
      "active" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_specialist_availability_weekday" CHECK ("weekday" BETWEEN 0 AND 6),
      CONSTRAINT "CHK_specialist_availability_time_order" CHECK ("startTime" < "endTime")
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_availability_rules_specialist" ON appointments_schema.specialist_availability_rules ("companyId", "specialistProfileId")`);
  await dataSource.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_specialist_availability_rules_active_window" ON appointments_schema.specialist_availability_rules ("companyId", "specialistProfileId", "weekday", "startTime", "endTime", "timezone") WHERE "active" = true`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.specialist_time_blocks (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "reason" text,
      "createdByUserId" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_specialist_time_blocks_time_order" CHECK ("startsAt" < "endsAt")
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_time_blocks_specialist_range" ON appointments_schema.specialist_time_blocks ("companyId", "specialistProfileId", "startsAt", "endsAt")`);

  // Fed by specialist-service.assigned/.removed (services-catalog-service) -
  // used to validate a client's preferred specialist is actually assigned to
  // the requested service.
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_specialist_projection (
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("serviceId", "specialistProfileId")
    )
  `);

  // AI-derived, not a source-of-truth table - moved here from
  // backend-projection-service in Phase 12 (see table-ownership-matrix.md).
  // Fed by ai.appointment_recommendation_created (ai-service, analytics.events
  // exchange). Safe to drop and rebuild; no backfill from the old table.
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_recommendation_projections (
      "id" uuid PRIMARY KEY,
      "appointmentId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "summary" text NOT NULL,
      "confidence" numeric(3, 2) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointment_recommendation_projections_appointmentId" ON appointments_schema.appointment_recommendation_projections ("appointmentId")`);

  // Fed by user.profile_created/.updated (users-service) to avoid direct
  // reads from users_schema when enriching appointment events.
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.client_profiles_projection (
      "userId" uuid PRIMARY KEY,
      "name" text,
      "email" text,
      "phone" text,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Fed by specialist.created/.updated (specialists-service) - lets this
  // service answer "does userId own specialistProfileId" locally so
  // specialists can view their own appointments/availability without a
  // company manager role.
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.specialist_owner_projection (
      "specialistProfileId" uuid PRIMARY KEY,
      "userId" uuid NOT NULL,
      "displayName" varchar(200),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await dataSource.query(`ALTER TABLE appointments_schema.specialist_owner_projection ADD COLUMN IF NOT EXISTS "displayName" varchar(200)`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_owner_projection_userId" ON appointments_schema.specialist_owner_projection ("userId")`);

  // Fed by company-specialist.accepted/.removed (company-specialists-service) -
  // lets this service reject availability management for a companyId/specialistProfileId
  // pair that was never linked (or has since been removed).
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.company_specialist_link_projection (
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "active" boolean NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "specialistProfileId")
    )
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_company_specialist_link_projection_specialistProfileId" ON appointments_schema.company_specialist_link_projection ("specialistProfileId")`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.outbox_events (
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
    ALTER TABLE appointments_schema.outbox_events
      ADD COLUMN IF NOT EXISTS "correlationId" text,
      ADD COLUMN IF NOT EXISTS "causationId" text
  `);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_status" ON appointments_schema.outbox_events ("status")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_nextRetryAt" ON appointments_schema.outbox_events ("nextRetryAt")`);
}
