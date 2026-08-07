import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailLogs1786082173335 implements MigrationInterface {
    name = 'AddEmailLogs1786082173335'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "toEmail" character varying(255) NOT NULL, "subject" character varying(255) NOT NULL, "body" text NOT NULL, "eventType" character varying(100) NOT NULL, "eventId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_999382218924e953a790d340571" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_93d34016727cf74f4609aebb6c" ON "email_logs"  ("eventType") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_93d34016727cf74f4609aebb6c"`);
        await queryRunner.query(`DROP TABLE "email_logs"`);
    }

}
