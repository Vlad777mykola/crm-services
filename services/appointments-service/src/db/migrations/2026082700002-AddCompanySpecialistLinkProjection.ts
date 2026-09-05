import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanySpecialistLinkProjection2026082700002 implements MigrationInterface {
  name = 'AddCompanySpecialistLinkProjection2026082700002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS appointments_schema.company_specialist_link_projection (
        "companyId" uuid NOT NULL,
        "specialistProfileId" uuid NOT NULL,
        "active" boolean NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("companyId", "specialistProfileId")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_company_specialist_link_projection_specialistProfileId" ON appointments_schema.company_specialist_link_projection ("specialistProfileId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS appointments_schema.company_specialist_link_projection`);
  }
}
