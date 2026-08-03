import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileFields1785761095804 implements MigrationInterface {
    name = 'AddUserProfileFields1785761095804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "city" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "city"`);
    }

}
