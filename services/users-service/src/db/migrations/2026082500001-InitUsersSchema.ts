import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsersSchema2026082500001 implements MigrationInterface {
  name = 'InitUsersSchema2026082500001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS users_schema`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_schema.users (
        "id" uuid PRIMARY KEY,
        "email" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_schema.processed_events (
        "event_id" uuid NOT NULL,
        "consumer_name" varchar(100) NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("event_id", "consumer_name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_schema.outbox_events (
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

    await queryRunner.query(`
      ALTER TABLE users_schema.outbox_events
        ADD COLUMN IF NOT EXISTS "correlationId" text,
        ADD COLUMN IF NOT EXISTS "causationId" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users_schema.processed_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS users_schema.outbox_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS users_schema.user_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS users_schema.users`);
  }
}
