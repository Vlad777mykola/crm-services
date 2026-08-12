import type { Pool, PoolClient } from 'pg';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type RelationStatus = 'active' | 'paused' | 'removed';

export interface CompanySpecialistRequestRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  requestedByUserId: string;
  status: RequestStatus;
  message: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySpecialistRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  status: RelationStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CompanySpecialistRepository {
  constructor(private readonly pool: Pool) {}

  async findActiveRelation(companyId: string, specialistProfileId: string): Promise<CompanySpecialistRow | undefined> {
    const { rows } = await this.pool.query<CompanySpecialistRow>(
      `SELECT * FROM company_specialists_schema.company_specialists
       WHERE "companyId" = $1 AND "specialistProfileId" = $2 AND "status" = 'active'
       LIMIT 1`,
      [companyId, specialistProfileId],
    );
    return rows[0];
  }

  async findPendingRequest(
    companyId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow | undefined> {
    const { rows } = await this.pool.query<CompanySpecialistRequestRow>(
      `SELECT * FROM company_specialists_schema.company_specialist_requests
       WHERE "companyId" = $1 AND "specialistProfileId" = $2 AND "status" = 'pending'
       LIMIT 1`,
      [companyId, specialistProfileId],
    );
    return rows[0];
  }

  async insertRequest(input: {
    companyId: string;
    specialistProfileId: string;
    requestedByUserId: string;
    message: string | null;
  }): Promise<CompanySpecialistRequestRow> {
    const { rows } = await this.pool.query<CompanySpecialistRequestRow>(
      `INSERT INTO company_specialists_schema.company_specialist_requests
         ("companyId", "specialistProfileId", "requestedByUserId", "status", "message")
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING *`,
      [input.companyId, input.specialistProfileId, input.requestedByUserId, input.message],
    );
    return rows[0]!;
  }

  async listByCompany(companyId: string): Promise<CompanySpecialistRequestRow[]> {
    const { rows } = await this.pool.query<CompanySpecialistRequestRow>(
      `SELECT * FROM company_specialists_schema.company_specialist_requests
       WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
      [companyId],
    );
    return rows;
  }

  async listActiveRelationsByCompany(companyId: string): Promise<CompanySpecialistRow[]> {
    const { rows } = await this.pool.query<CompanySpecialistRow>(
      `SELECT * FROM company_specialists_schema.company_specialists
       WHERE "companyId" = $1 AND "status" = 'active' ORDER BY "startedAt" DESC`,
      [companyId],
    );
    return rows;
  }

  async listBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRequestRow[]> {
    const { rows } = await this.pool.query<CompanySpecialistRequestRow>(
      `SELECT * FROM company_specialists_schema.company_specialist_requests
       WHERE "specialistProfileId" = $1 ORDER BY "createdAt" DESC`,
      [specialistProfileId],
    );
    return rows;
  }

  async listActiveRelationsBySpecialist(specialistProfileId: string): Promise<CompanySpecialistRow[]> {
    const { rows } = await this.pool.query<CompanySpecialistRow>(
      `SELECT * FROM company_specialists_schema.company_specialists
       WHERE "specialistProfileId" = $1 AND "status" = 'active' ORDER BY "startedAt" DESC`,
      [specialistProfileId],
    );
    return rows;
  }

  async findPendingRequestForSpecialist(
    requestId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRequestRow | undefined> {
    const { rows } = await this.pool.query<CompanySpecialistRequestRow>(
      `SELECT * FROM company_specialists_schema.company_specialist_requests
       WHERE "id" = $1 AND "specialistProfileId" = $2
       LIMIT 1`,
      [requestId, specialistProfileId],
    );
    return rows[0];
  }

  async markRequestResponded(client: PoolClient, requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await client.query(
      `UPDATE company_specialists_schema.company_specialist_requests
       SET "status" = $2, "respondedAt" = now(), "updatedAt" = now()
       WHERE "id" = $1`,
      [requestId, status],
    );
  }

  async upsertActiveRelation(
    client: PoolClient,
    companyId: string,
    specialistProfileId: string,
  ): Promise<CompanySpecialistRow> {
    const { rows } = await client.query<CompanySpecialistRow>(
      `INSERT INTO company_specialists_schema.company_specialists
         ("companyId", "specialistProfileId", "status", "startedAt", "endedAt")
       VALUES ($1, $2, 'active', now(), NULL)
       ON CONFLICT ("companyId", "specialistProfileId")
       DO UPDATE SET "status" = 'active', "startedAt" = now(), "endedAt" = NULL, "updatedAt" = now()
       RETURNING *`,
      [companyId, specialistProfileId],
    );
    return rows[0]!;
  }
}
