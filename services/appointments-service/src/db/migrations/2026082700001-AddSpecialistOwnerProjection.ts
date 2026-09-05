import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialistOwnerProjection2026082700001 implements MigrationInterface {
  name = 'AddSpecialistOwnerProjection2026082700001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.specialist_owner_projection (
        "specialistProfileId" uuid PRIMARY KEY,
        "userId" uuid NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_specialist_owner_projection_userId" ON appointments_schema.specialist_owner_projection ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.specialist_owner_projection`);
  }
}
