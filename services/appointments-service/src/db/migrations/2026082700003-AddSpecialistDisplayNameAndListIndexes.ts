import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialistDisplayNameAndListIndexes2026082700003 implements MigrationInterface {
  name = 'AddSpecialistDisplayNameAndListIndexes2026082700003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE appointments_schema.specialist_owner_projection
      ADD COLUMN IF NOT EXISTS "displayName" varchar(200)
    `);

    // Persona list views (company/client/specialist) always filter by status
    // alongside the owning id - composite indexes serve those queries better
    // than the single-column indexes created in the initial migration.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_companyId_status"
      ON appointments_schema.appointments ("companyId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_clientUserId_status"
      ON appointments_schema.appointments ("clientUserId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_specialistProfileId_status"
      ON appointments_schema.appointments ("specialistProfileId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS appointments_schema."IDX_appointments_specialistProfileId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS appointments_schema."IDX_appointments_clientUserId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS appointments_schema."IDX_appointments_companyId_status"`);
    await queryRunner.query(`
      ALTER TABLE appointments_schema.specialist_owner_projection
      DROP COLUMN IF EXISTS "displayName"
    `);
  }
}
