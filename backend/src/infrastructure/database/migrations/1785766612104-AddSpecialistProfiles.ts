import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpecialistProfiles1785766612104 implements MigrationInterface {
    name = 'AddSpecialistProfiles1785766612104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."specialist_profiles_status_enum" AS ENUM('draft', 'published', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "specialist_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "displayName" character varying(255) NOT NULL, "headline" character varying(255), "bio" text, "category" character varying(100), "city" character varying(255), "isRemoteSupported" boolean NOT NULL DEFAULT false, "status" "public"."specialist_profiles_status_enum" NOT NULL DEFAULT 'draft', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_255dd7971fa30faa31b7971020a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0c7669919f863cd0e218cf97ed" ON "specialist_profiles"  ("userId") `);
        await queryRunner.query(`ALTER TABLE "specialist_profiles" ADD CONSTRAINT "FK_0c7669919f863cd0e218cf97ede" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "specialist_profiles" DROP CONSTRAINT "FK_0c7669919f863cd0e218cf97ede"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c7669919f863cd0e218cf97ed"`);
        await queryRunner.query(`DROP TABLE "specialist_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."specialist_profiles_status_enum"`);
    }

}
