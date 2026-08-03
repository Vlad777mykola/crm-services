import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPhone1785758051625 implements MigrationInterface {
    name = 'AddUserPhone1785758051625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(30)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }

}
