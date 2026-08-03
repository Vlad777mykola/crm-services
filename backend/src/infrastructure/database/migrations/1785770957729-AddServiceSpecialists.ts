import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceSpecialists1785770957729 implements MigrationInterface {
    name = 'AddServiceSpecialists1785770957729'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "service_specialists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "companyId" uuid NOT NULL, "specialistProfileId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_service_specialists_service_specialist" UNIQUE ("serviceId", "specialistProfileId"), CONSTRAINT "PK_4ab43539762fd38d2fa9906fda5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c576980d1fcaab1715e33cf334" ON "service_specialists"  ("serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc6b2c7e2e936c865708bde5f6" ON "service_specialists"  ("specialistProfileId") `);
        await queryRunner.query(`ALTER TABLE "service_specialists" ADD CONSTRAINT "FK_c576980d1fcaab1715e33cf3346" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_specialists" ADD CONSTRAINT "FK_760d6b480ce995a019c4746140a" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_specialists" ADD CONSTRAINT "FK_cc6b2c7e2e936c865708bde5f67" FOREIGN KEY ("specialistProfileId") REFERENCES "specialist_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_specialists" DROP CONSTRAINT "FK_cc6b2c7e2e936c865708bde5f67"`);
        await queryRunner.query(`ALTER TABLE "service_specialists" DROP CONSTRAINT "FK_760d6b480ce995a019c4746140a"`);
        await queryRunner.query(`ALTER TABLE "service_specialists" DROP CONSTRAINT "FK_c576980d1fcaab1715e33cf3346"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc6b2c7e2e936c865708bde5f6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c576980d1fcaab1715e33cf334"`);
        await queryRunner.query(`DROP TABLE "service_specialists"`);
    }

}
