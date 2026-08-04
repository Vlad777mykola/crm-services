import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusHistory1785854101817 implements MigrationInterface {
    name = 'AddStatusHistory1785854101817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "status_history_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "fromStatus" character varying(50), "toStatus" character varying(50) NOT NULL, "changedByUserId" uuid, "reason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d796f9a315fa90fe0441369744f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_274fea438ec606ea8fe7fd43d3" ON "status_history_entries"  ("entityType") `);
        await queryRunner.query(`CREATE INDEX "IDX_f26176226b230cd4a1cfb57634" ON "status_history_entries"  ("entityId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f26176226b230cd4a1cfb57634"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_274fea438ec606ea8fe7fd43d3"`);
        await queryRunner.query(`DROP TABLE "status_history_entries"`);
    }

}
