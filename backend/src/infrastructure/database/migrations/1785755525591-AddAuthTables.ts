import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthTables1785755525591 implements MigrationInterface {
    name = 'AddAuthTables1785755525591'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "auth_identities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerUserId" character varying(255) NOT NULL, "email" character varying(255), "passwordHash" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_auth_identities_provider_provider_user_id" UNIQUE ("provider", "providerUserId"), CONSTRAINT "PK_63a29aebcddd09448dbeee4666b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6ed26ac7e2276ae145ca68c23a" ON "auth_identities"  ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."auth_sessions_status_enum" AS ENUM('active', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "auth_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "refreshTokenHash" character varying(255) NOT NULL, "status" "public"."auth_sessions_status_enum" NOT NULL DEFAULT 'active', "userAgent" character varying(512), "ipAddress" character varying(64), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_167b8001a5a5b2aa5ffb94bb5ec" UNIQUE ("refreshTokenHash"), CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_925b24d7fc2f9324ce972aee02" ON "auth_sessions"  ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'disabled')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "status" "public"."users_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "auth_identities" ADD CONSTRAINT "FK_6ed26ac7e2276ae145ca68c23af" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_925b24d7fc2f9324ce972aee025" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_925b24d7fc2f9324ce972aee025"`);
        await queryRunner.query(`ALTER TABLE "auth_identities" DROP CONSTRAINT "FK_6ed26ac7e2276ae145ca68c23af"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_925b24d7fc2f9324ce972aee02"`);
        await queryRunner.query(`DROP TABLE "auth_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."auth_sessions_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ed26ac7e2276ae145ca68c23a"`);
        await queryRunner.query(`DROP TABLE "auth_identities"`);
    }

}
