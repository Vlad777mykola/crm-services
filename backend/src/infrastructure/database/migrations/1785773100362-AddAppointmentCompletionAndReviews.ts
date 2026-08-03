import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentCompletionAndReviews1785773100362 implements MigrationInterface {
    name = 'AddAppointmentCompletionAndReviews1785773100362'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointmentId" uuid NOT NULL, "companyId" uuid NOT NULL, "serviceId" uuid NOT NULL, "specialistProfileId" uuid, "clientUserId" uuid NOT NULL, "rating" smallint NOT NULL, "comment" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_reviews_appointment" UNIQUE ("appointmentId"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45a6cefc24d5af16842be69a65" ON "reviews"  ("appointmentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e2769e29b8dd0ac1b578fa0267" ON "reviews"  ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9563540c43639a0669f68e8ebe" ON "reviews"  ("serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5147df1c25cb92f1c554c61087" ON "reviews"  ("specialistProfileId") `);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_45a6cefc24d5af16842be69a65a" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_e2769e29b8dd0ac1b578fa02679" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_9563540c43639a0669f68e8ebe3" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_5147df1c25cb92f1c554c61087b" FOREIGN KEY ("specialistProfileId") REFERENCES "specialist_profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_d5aacc3853f3e32aab0006a2489" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_d5aacc3853f3e32aab0006a2489"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_5147df1c25cb92f1c554c61087b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_9563540c43639a0669f68e8ebe3"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_e2769e29b8dd0ac1b578fa02679"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_45a6cefc24d5af16842be69a65a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5147df1c25cb92f1c554c61087"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9563540c43639a0669f68e8ebe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2769e29b8dd0ac1b578fa0267"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_45a6cefc24d5af16842be69a65"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
    }

}
