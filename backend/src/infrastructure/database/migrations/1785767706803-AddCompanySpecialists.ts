import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanySpecialists1785767706803 implements MigrationInterface {
    name = 'AddCompanySpecialists1785767706803'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."company_specialists_status_enum" AS ENUM('active', 'paused', 'removed')`);
        await queryRunner.query(`CREATE TABLE "company_specialists" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "specialistProfileId" uuid NOT NULL, "status" "public"."company_specialists_status_enum" NOT NULL DEFAULT 'active', "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_company_specialists_company_specialist" UNIQUE ("companyId", "specialistProfileId"), CONSTRAINT "PK_ba92153ff8667f03e2b54a13273" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_09607d926a3db935e3a1ab4cd4" ON "company_specialists"  ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0d8dab3c5569217a1c7927875b" ON "company_specialists"  ("specialistProfileId") `);
        await queryRunner.query(`CREATE TYPE "public"."company_specialist_requests_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "company_specialist_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "specialistProfileId" uuid NOT NULL, "requestedByUserId" uuid NOT NULL, "status" "public"."company_specialist_requests_status_enum" NOT NULL DEFAULT 'pending', "message" text, "respondedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c6879c5fa6f433bd4691a4f8a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a0e221ccb2db4967321dfeb23b" ON "company_specialist_requests"  ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_14fafe446a211af375333c02ff" ON "company_specialist_requests"  ("specialistProfileId") `);
        await queryRunner.query(`ALTER TABLE "company_specialists" ADD CONSTRAINT "FK_09607d926a3db935e3a1ab4cd43" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_specialists" ADD CONSTRAINT "FK_0d8dab3c5569217a1c7927875b0" FOREIGN KEY ("specialistProfileId") REFERENCES "specialist_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" ADD CONSTRAINT "FK_a0e221ccb2db4967321dfeb23bb" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" ADD CONSTRAINT "FK_14fafe446a211af375333c02ff4" FOREIGN KEY ("specialistProfileId") REFERENCES "specialist_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" ADD CONSTRAINT "FK_88d58c7f9606c18c84231ddcc3a" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" DROP CONSTRAINT "FK_88d58c7f9606c18c84231ddcc3a"`);
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" DROP CONSTRAINT "FK_14fafe446a211af375333c02ff4"`);
        await queryRunner.query(`ALTER TABLE "company_specialist_requests" DROP CONSTRAINT "FK_a0e221ccb2db4967321dfeb23bb"`);
        await queryRunner.query(`ALTER TABLE "company_specialists" DROP CONSTRAINT "FK_0d8dab3c5569217a1c7927875b0"`);
        await queryRunner.query(`ALTER TABLE "company_specialists" DROP CONSTRAINT "FK_09607d926a3db935e3a1ab4cd43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14fafe446a211af375333c02ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0e221ccb2db4967321dfeb23b"`);
        await queryRunner.query(`DROP TABLE "company_specialist_requests"`);
        await queryRunner.query(`DROP TYPE "public"."company_specialist_requests_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d8dab3c5569217a1c7927875b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_09607d926a3db935e3a1ab4cd4"`);
        await queryRunner.query(`DROP TABLE "company_specialists"`);
        await queryRunner.query(`DROP TYPE "public"."company_specialists_status_enum"`);
    }

}
