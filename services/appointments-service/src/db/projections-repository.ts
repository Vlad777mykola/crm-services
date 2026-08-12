import type { Pool, PoolClient } from 'pg';

export interface CompanyProjectionRow {
  companyId: string;
  name: string;
}

export interface ServiceProjectionRow {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
}

export class ProjectionsRepository {
  constructor(private readonly pool: Pool) {}

  async upsertMembership(client: PoolClient, companyId: string, userId: string, role: string): Promise<void> {
    await client.query(
      `INSERT INTO appointments_schema.appointment_membership_projection ("companyId", "userId", "role")
       VALUES ($1, $2, $3)
       ON CONFLICT ("companyId", "userId") DO UPDATE SET "role" = $3, "updatedAt" = now()`,
      [companyId, userId, role],
    );
  }

  async removeMembership(client: PoolClient, companyId: string, userId: string): Promise<void> {
    await client.query(
      `DELETE FROM appointments_schema.appointment_membership_projection WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId],
    );
  }

  async findMembershipRole(companyId: string, userId: string): Promise<string | undefined> {
    const { rows } = await this.pool.query<{ role: string }>(
      `SELECT "role" FROM appointments_schema.appointment_membership_projection WHERE "companyId" = $1 AND "userId" = $2`,
      [companyId, userId],
    );
    return rows[0]?.role;
  }

  async upsertCompany(client: PoolClient, companyId: string, name: string): Promise<void> {
    await client.query(
      `INSERT INTO appointments_schema.appointment_company_projection ("companyId", "name")
       VALUES ($1, $2)
       ON CONFLICT ("companyId") DO UPDATE SET "name" = $2, "updatedAt" = now()`,
      [companyId, name],
    );
  }

  async findCompany(companyId: string): Promise<CompanyProjectionRow | undefined> {
    const { rows } = await this.pool.query<CompanyProjectionRow>(
      `SELECT "companyId", "name" FROM appointments_schema.appointment_company_projection WHERE "companyId" = $1`,
      [companyId],
    );
    return rows[0];
  }

  async upsertService(client: PoolClient, input: ServiceProjectionRow): Promise<void> {
    await client.query(
      `INSERT INTO appointments_schema.appointment_service_projection ("serviceId", "companyId", "name", "status")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("serviceId") DO UPDATE SET "companyId" = $2, "name" = $3, "status" = $4, "updatedAt" = now()`,
      [input.serviceId, input.companyId, input.name, input.status],
    );
  }

  async findService(serviceId: string): Promise<ServiceProjectionRow | undefined> {
    const { rows } = await this.pool.query<ServiceProjectionRow>(
      `SELECT "serviceId", "companyId", "name", "status" FROM appointments_schema.appointment_service_projection WHERE "serviceId" = $1`,
      [serviceId],
    );
    return rows[0];
  }

  async upsertServiceSpecialist(client: PoolClient, serviceId: string, specialistProfileId: string): Promise<void> {
    await client.query(
      `INSERT INTO appointments_schema.appointment_service_specialist_projection ("serviceId", "specialistProfileId")
       VALUES ($1, $2)
       ON CONFLICT ("serviceId", "specialistProfileId") DO UPDATE SET "updatedAt" = now()`,
      [serviceId, specialistProfileId],
    );
  }

  async removeServiceSpecialist(client: PoolClient, serviceId: string, specialistProfileId: string): Promise<void> {
    await client.query(
      `DELETE FROM appointments_schema.appointment_service_specialist_projection WHERE "serviceId" = $1 AND "specialistProfileId" = $2`,
      [serviceId, specialistProfileId],
    );
  }

  async isServiceSpecialistAssigned(serviceId: string, specialistProfileId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM appointments_schema.appointment_service_specialist_projection WHERE "serviceId" = $1 AND "specialistProfileId" = $2`,
      [serviceId, specialistProfileId],
    );
    return rows.length > 0;
  }
}
