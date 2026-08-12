import { randomUUID } from 'node:crypto';

import { query } from './db.js';
import { daysFromNow, insertQualified } from './insert.js';

export interface CompanyMirrorInput {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: 'draft' | 'published' | 'suspended';
  isRemoteSupported: boolean;
  city: string | null;
  address: string | null;
  createdByUserId: string;
}

export interface CompanyStatusHistoryMirrorInput {
  companyId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason?: string | null;
  createdAt?: Date;
}

/** Mirrors companies-service/src/db/schema.ts so seed works before any service starts. */
export async function ensureCompaniesSchema(): Promise<void> {
  await query(`CREATE SCHEMA IF NOT EXISTS companies_schema`);

  await query(`
    CREATE TABLE IF NOT EXISTS companies_schema.companies (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "slug" varchar(255) NOT NULL UNIQUE,
      "description" text,
      "category" varchar(100),
      "website" varchar(255),
      "phone" varchar(30),
      "email" varchar(255),
      "status" varchar(20) NOT NULL DEFAULT 'draft',
      "isRemoteSupported" boolean NOT NULL DEFAULT false,
      "city" varchar(255),
      "address" varchar(255),
      "createdByUserId" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS "IDX_companies_createdByUserId" ON companies_schema.companies ("createdByUserId")
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS companies_schema.company_status_history (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "companyId" uuid NOT NULL REFERENCES companies_schema.companies ("id") ON DELETE CASCADE,
      "fromStatus" varchar(50),
      "toStatus" varchar(50) NOT NULL,
      "changedByUserId" uuid,
      "reason" text,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_status_history_companyId" ON companies_schema.company_status_history ("companyId")
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS companies_schema.company_insight_projections (
      "id" uuid PRIMARY KEY,
      "companyId" uuid NOT NULL,
      "insightType" varchar(100) NOT NULL,
      "summary" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS "IDX_company_insight_projections_companyId" ON companies_schema.company_insight_projections ("companyId")
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS companies_schema.processed_events (
      "event_id" uuid NOT NULL,
      "consumer_name" varchar(100) NOT NULL,
      "processed_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("event_id", "consumer_name")
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS companies_schema.outbox_events (
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

export async function seedCompaniesSchema(companies: CompanyMirrorInput[], history: CompanyStatusHistoryMirrorInput[]): Promise<void> {
  await ensureCompaniesSchema();

  for (const company of companies) {
    await insertQualified('companies_schema', 'companies', {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description,
      category: company.category,
      website: company.website,
      phone: company.phone,
      email: company.email,
      status: company.status,
      isRemoteSupported: company.isRemoteSupported,
      city: company.city,
      address: company.address,
      createdByUserId: company.createdByUserId,
    });
  }

  for (const entry of history) {
    await insertQualified('companies_schema', 'company_status_history', {
      companyId: entry.companyId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedByUserId: entry.changedByUserId,
      reason: entry.reason ?? null,
      ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
    });
  }

  const published = companies.filter((c) => c.status === 'published').length;
  console.log(
    `[fill_dump_db] mirrored ${companies.length} rows into companies_schema.companies (${published} published for GET /companies/public)`,
  );
}

/** Two published companies only — enough for companies-service + frontend /companies without legacy seed. */
export async function seedMinimalPublishedCompanies(): Promise<void> {
  await ensureCompaniesSchema();

  const ownerId = randomUUID();

  const dentalId = await insertQualified('companies_schema', 'companies', {
    name: 'Bright Smile Dental',
    slug: 'bright-smile-dental',
    description: 'Full-service dental clinic in the city center.',
    category: 'Dental',
    website: 'https://bright-smile-dental.example.com',
    phone: '+380441234501',
    email: 'contact@bright-smile-dental.example.com',
    status: 'published',
    isRemoteSupported: false,
    city: 'Kyiv',
    address: '12 Khreshchatyk St',
    createdByUserId: ownerId,
  });

  const beautyId = await insertQualified('companies_schema', 'companies', {
    name: 'Glow Beauty Studio',
    slug: 'glow-beauty-studio',
    description: 'Hair, nails, and skincare - in-studio or at your place.',
    category: 'Beauty',
    website: 'https://glow-beauty-studio.example.com',
    phone: '+380441234502',
    email: 'contact@glow-beauty-studio.example.com',
    status: 'published',
    isRemoteSupported: true,
    city: 'Lviv',
    address: '5 Rynok Square',
    createdByUserId: ownerId,
  });

  await insertQualified('companies_schema', 'company_status_history', {
    companyId: dentalId,
    fromStatus: 'draft',
    toStatus: 'published',
    changedByUserId: ownerId,
    reason: null,
    createdAt: daysFromNow(-30),
  });
  await insertQualified('companies_schema', 'company_status_history', {
    companyId: beautyId,
    fromStatus: 'draft',
    toStatus: 'published',
    changedByUserId: ownerId,
    reason: null,
    createdAt: daysFromNow(-20),
  });

  console.log('[fill_dump_db] created 2 published companies in companies_schema (GET /companies/public)');
}
