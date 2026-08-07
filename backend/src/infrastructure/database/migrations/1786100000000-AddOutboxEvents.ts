import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutboxEvents1786100000000 implements MigrationInterface {
    name = 'AddOutboxEvents1786100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventType" character varying(100) NOT NULL, "exchange" character varying(100) NOT NULL, "routingKey" character varying(150) NOT NULL, "aggregateType" character varying(100) NOT NULL, "aggregateId" uuid NOT NULL, "payload" jsonb NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT 0, "nextRetryAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "publishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9e35424f4d3dcb4b1d33952509c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_88c5c93c8cf4e0eaf5124d70b7" ON "outbox_events" ("eventType") `);
        await queryRunner.query(`CREATE INDEX "IDX_c15a5cbe7d2f0aa6bef4c60e83" ON "outbox_events" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_3f5b1e6b9f3d1a1a0d9f1c2b4e" ON "outbox_events" ("nextRetryAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3f5b1e6b9f3d1a1a0d9f1c2b4e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c15a5cbe7d2f0aa6bef4c60e83"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88c5c93c8cf4e0eaf5124d70b7"`);
        await queryRunner.query(`DROP TABLE "outbox_events"`);
    }

}
