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

  await query(`CREATE SCHEMA IF NOT EXISTS users_schema`);
  await query(`
    CREATE TABLE IF NOT EXISTS users_schema.users (
      "id" uuid PRIMARY KEY,
      "email" varchar(255),
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
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

  await query(`CREATE SCHEMA IF NOT EXISTS specialists_schema`);
  await query(`
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
  await query(`
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

  await query(`CREATE SCHEMA IF NOT EXISTS appointments_schema`);
  await query(`
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
