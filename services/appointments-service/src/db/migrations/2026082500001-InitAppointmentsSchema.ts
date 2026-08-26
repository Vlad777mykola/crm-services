import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAppointmentsSchema2026082500001 implements MigrationInterface {
  name = 'InitAppointmentsSchema2026082500001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS appointments_schema`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`
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
    await queryRunner.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "startAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "endAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "createdByUserId" uuid`);
    await queryRunner.query(`UPDATE appointments_schema.appointments SET "startAt" = COALESCE("startAt", "requestedStartAt") WHERE "startAt" IS NULL`);
    await queryRunner.query(`UPDATE appointments_schema.appointments SET "endAt" = COALESCE("endAt", "requestedStartAt" + interval '60 minutes') WHERE "endAt" IS NULL`);
    await queryRunner.query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "startAt" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "endAt" SET NOT NULL`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'appointments_time_order'
            AND conrelid = 'appointments_schema.appointments'::regclass
        ) THEN
          ALTER TABLE appointments_schema.appointments
            ADD CONSTRAINT appointments_time_order CHECK ("startAt" < "endAt");
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId" ON appointments_schema.appointments ("companyId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_serviceId" ON appointments_schema.appointments ("serviceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_clientUserId" ON appointments_schema.appointments ("clientUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_specialistProfileId" ON appointments_schema.appointments ("specialistProfileId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_startAt" ON appointments_schema.appointments ("startAt")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
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

    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointment_status_history_appointmentId" ON appointments_schema.appointment_status_history ("appointmentId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.appointment_membership_projection (
        "companyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" varchar(20) NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("companyId", "userId")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.appointment_company_projection (
        "companyId" uuid PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_projection (
        "serviceId" uuid PRIMARY KEY,
        "companyId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL,
        "durationMinutes" int NOT NULL DEFAULT 60,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_availability_rules_companyId" ON appointments_schema.company_availability_rules ("companyId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_company_availability_rules_active_window" ON appointments_schema.company_availability_rules ("companyId", "weekday", "startTime", "endTime", "timezone") WHERE "active" = true`);

    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_time_blocks_company_range" ON appointments_schema.company_time_blocks ("companyId", "startsAt", "endsAt")`);

    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_availability_rules_specialist" ON appointments_schema.specialist_availability_rules ("companyId", "specialistProfileId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_specialist_availability_rules_active_window" ON appointments_schema.specialist_availability_rules ("companyId", "specialistProfileId", "weekday", "startTime", "endTime", "timezone") WHERE "active" = true`);

    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_time_blocks_specialist_range" ON appointments_schema.specialist_time_blocks ("companyId", "specialistProfileId", "startsAt", "endsAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_specialist_projection (
        "serviceId" uuid NOT NULL,
        "specialistProfileId" uuid NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("serviceId", "specialistProfileId")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.appointment_recommendation_projections (
        "id" uuid PRIMARY KEY,
        "appointmentId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "summary" text NOT NULL,
        "confidence" numeric(3, 2) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointment_recommendation_projections_appointmentId" ON appointments_schema.appointment_recommendation_projections ("appointmentId")`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.client_profiles_projection (
        "userId" uuid PRIMARY KEY,
        "name" text,
        "email" text,
        "phone" text,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.processed_events (
        "event_id" uuid NOT NULL,
        "consumer_name" varchar(100) NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("event_id", "consumer_name")
      )
    `);
    await queryRunner.query(`
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_status" ON appointments_schema.outbox_events ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_appointments_outbox_events_nextRetryAt" ON appointments_schema.outbox_events ("nextRetryAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.outbox_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.processed_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.client_profiles_projection`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_recommendation_projections`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_service_specialist_projection`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.specialist_time_blocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.specialist_availability_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.company_time_blocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.company_availability_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_service_projection`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_company_projection`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_membership_projection`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointment_status_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.appointments`);
  }
}
