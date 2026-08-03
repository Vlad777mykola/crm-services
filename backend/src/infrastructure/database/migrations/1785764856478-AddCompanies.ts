import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanies1785764856478 implements MigrationInterface {
    name = 'AddCompanies1785764856478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."companies_status_enum" AS ENUM('draft', 'published', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text, "category" character varying(100), "website" character varying(255), "phone" character varying(30), "email" character varying(255), "status" "public"."companies_status_enum" NOT NULL DEFAULT 'draft', "isRemoteSupported" boolean NOT NULL DEFAULT false, "city" character varying(255), "address" character varying(255), "createdByUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b28b07d25e4324eee577de5496" ON "companies"  ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_f96b8193812ea5baeff926b848" ON "companies"  ("createdByUserId") `);
        await queryRunner.query(`CREATE TYPE "public"."company_members_role_enum" AS ENUM('owner', 'manager')`);
        await queryRunner.query(`CREATE TYPE "public"."company_members_status_enum" AS ENUM('active', 'removed')`);
        await queryRunner.query(`CREATE TABLE "company_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."company_members_role_enum" NOT NULL, "status" "public"."company_members_status_enum" NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_company_members_company_user" UNIQUE ("companyId", "userId"), CONSTRAINT "PK_b159163d9222448886158bc5385" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ee30e433648d2a45dfd38cfb36" ON "company_members"  ("companyId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b90cba2c7d2186fa520ee5e39a" ON "company_members"  ("userId") `);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company_members" ADD CONSTRAINT "FK_b90cba2c7d2186fa520ee5e39a9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_b90cba2c7d2186fa520ee5e39a9"`);
        await queryRunner.query(`ALTER TABLE "company_members" DROP CONSTRAINT "FK_ee30e433648d2a45dfd38cfb366"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b90cba2c7d2186fa520ee5e39a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee30e433648d2a45dfd38cfb36"`);
        await queryRunner.query(`DROP TABLE "company_members"`);
        await queryRunner.query(`DROP TYPE "public"."company_members_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."company_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f96b8193812ea5baeff926b848"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b28b07d25e4324eee577de5496"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
    }

}
