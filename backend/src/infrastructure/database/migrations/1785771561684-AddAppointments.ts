import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointments1785771561684 implements MigrationInterface {
    name = 'AddAppointments1785771561684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('pending', 'approved', 'rejected', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "serviceId" uuid NOT NULL, "specialistProfileId" uuid, "clientUserId" uuid NOT NULL, "requestedStartAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'pending', "notes" text, "respondedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_48d9b0c87ddc67da594c616dca" ON "appointments"  ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f77953c373efb8ab146d98e90c" ON "appointments"  ("serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa5f37eb0021c163f7a072b9e0" ON "appointments"  ("specialistProfileId") `);
        await queryRunner.query(`CREATE INDEX "IDX_eb13678c021fe98bb5057c83c9" ON "appointments"  ("clientUserId") `);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_48d9b0c87ddc67da594c616dca2" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_f77953c373efb8ab146d98e90c3" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_fa5f37eb0021c163f7a072b9e03" FOREIGN KEY ("specialistProfileId") REFERENCES "specialist_profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_eb13678c021fe98bb5057c83c92" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_eb13678c021fe98bb5057c83c92"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_fa5f37eb0021c163f7a072b9e03"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_f77953c373efb8ab146d98e90c3"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_48d9b0c87ddc67da594c616dca2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb13678c021fe98bb5057c83c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa5f37eb0021c163f7a072b9e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f77953c373efb8ab146d98e90c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48d9b0c87ddc67da594c616dca"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
    }

}
