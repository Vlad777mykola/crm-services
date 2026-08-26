import { query } from './db.js';
import { ensureCompaniesSchema } from './seed-microservices.js';

/** Creates every microservice schema/table this seed script touches (idempotent). */
export async function ensureAllMicroserviceSchemas(): Promise<void> {
  await query(`CREATE SCHEMA IF NOT EXISTS auth_schema`);
  await query(`
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
  await query(`
    CREATE TABLE IF NOT EXISTS auth_schema.auth_membership_projection (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "role" varchar(50) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_auth_membership_projection_company_user" UNIQUE ("companyId", "userId")
    )
  `);

  // users_schema is managed by users-service TypeORM migrations.

  await ensureCompaniesSchema();

  await query(`CREATE SCHEMA IF NOT EXISTS company_members_schema`);
  await query(`
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

  // specialists_schema is managed by specialists-service TypeORM migrations.

  await query(`CREATE SCHEMA IF NOT EXISTS company_specialists_schema`);
  await query(`
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
  await query(`
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
  await query(`
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
  await query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_specialists_membership_projection_userId"
    ON company_specialists_schema.company_membership_projection ("userId")
  `);

  await query(`CREATE SCHEMA IF NOT EXISTS services_schema`);
  await query(`
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
  await query(`
    CREATE TABLE IF NOT EXISTS services_schema.service_specialists (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "serviceId" uuid NOT NULL REFERENCES services_schema.services ("id") ON DELETE CASCADE,
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_service_specialists_service_specialist" UNIQUE ("serviceId", "specialistProfileId")
    )
  `);
  await query(`
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
  await query(`
    CREATE TABLE IF NOT EXISTS services_schema.company_membership_projection (
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" text NOT NULL,
      "status" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "userId")
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS "IDX_services_membership_projection_userId"
    ON services_schema.company_membership_projection ("userId")
  `);

  await query(`CREATE SCHEMA IF NOT EXISTS appointments_schema`);
  await query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
  await query(`
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
  await query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "startAt" timestamptz`);
  await query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "endAt" timestamptz`);
  await query(`ALTER TABLE appointments_schema.appointments ADD COLUMN IF NOT EXISTS "createdByUserId" uuid`);
  await query(`UPDATE appointments_schema.appointments SET "startAt" = COALESCE("startAt", "requestedStartAt") WHERE "startAt" IS NULL`);
  await query(`UPDATE appointments_schema.appointments SET "endAt" = COALESCE("endAt", "requestedStartAt" + interval '60 minutes') WHERE "endAt" IS NULL`);
  await query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "startAt" SET NOT NULL`);
  await query(`ALTER TABLE appointments_schema.appointments ALTER COLUMN "endAt" SET NOT NULL`);
  await query(`
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
  await query(`
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
  await query(`
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
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.client_profiles_projection (
      "userId" uuid PRIMARY KEY,
      "name" text,
      "email" text,
      "phone" text,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_membership_projection (
      "companyId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "role" varchar(20) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("companyId", "userId")
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_company_projection (
      "companyId" uuid PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_projection (
      "serviceId" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "status" varchar(20) NOT NULL,
      "durationMinutes" int NOT NULL DEFAULT 60,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`ALTER TABLE appointments_schema.appointment_service_projection ADD COLUMN IF NOT EXISTS "durationMinutes" int NOT NULL DEFAULT 60`);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_service_specialist_projection (
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("serviceId", "specialistProfileId")
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.appointment_recommendation_projections (
      "id" uuid PRIMARY KEY,
      "appointmentId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "summary" text NOT NULL,
      "confidence" numeric(3, 2) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.company_availability_rules (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "weekday" smallint NOT NULL,
      "startTime" time NOT NULL,
      "endTime" time NOT NULL,
      "timezone" varchar(100) NOT NULL DEFAULT 'UTC',
      "active" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.company_time_blocks (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "reason" text,
      "createdByUserId" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
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
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.specialist_time_blocks (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL,
      "specialistProfileId" uuid NOT NULL,
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "reason" text,
      "createdByUserId" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS appointments_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);
  await query(`
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

  await query(`CREATE SCHEMA IF NOT EXISTS reviews_schema`);
  await query(`
    CREATE TABLE IF NOT EXISTS reviews_schema.reviews (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "appointmentId" uuid NOT NULL,
      "companyId" uuid NOT NULL,
      "serviceId" uuid NOT NULL,
      "specialistProfileId" uuid,
      "clientUserId" uuid NOT NULL,
      "rating" smallint NOT NULL,
      "comment" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS reviews_schema.appointment_review_eligibility_projection (
      "appointmentId" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "serviceId" uuid NOT NULL,
      "clientUserId" uuid NOT NULL,
      "specialistProfileId" uuid,
      "serviceName" text,
      "completedAt" timestamptz,
      "reviewAllowed" boolean NOT NULL DEFAULT false,
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(`CREATE SCHEMA IF NOT EXISTS notifications_schema`);
  await query(`
    CREATE TABLE IF NOT EXISTS notifications_schema.notifications (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "type" varchar(100) NOT NULL,
      "title" varchar(255) NOT NULL,
      "body" text,
      "metadata" jsonb,
      "isRead" boolean NOT NULL DEFAULT false,
      "readAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS notifications_schema.email_logs (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "toEmail" varchar(255) NOT NULL,
      "subject" varchar(255) NOT NULL,
      "body" text NOT NULL,
      "eventType" varchar(100) NOT NULL,
      "eventId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
}
