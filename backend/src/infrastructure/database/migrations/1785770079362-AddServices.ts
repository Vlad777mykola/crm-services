import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServices1785770079362 implements MigrationInterface {
    name = 'AddServices1785770079362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."services_status_enum" AS ENUM('draft', 'published', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "category" character varying(100), "durationMinutes" integer NOT NULL, "price" numeric(10,2), "status" "public"."services_status_enum" NOT NULL DEFAULT 'draft', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_25334fffe4ce341dd1da38acbd" ON "services"  ("companyId") `);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_25334fffe4ce341dd1da38acbd9" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_25334fffe4ce341dd1da38acbd9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25334fffe4ce341dd1da38acbd"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP TYPE "public"."services_status_enum"`);
    }

}
