import type { Pool, PoolClient } from 'pg';

export type ServiceStatus = 'draft' | 'published' | 'suspended';

export interface ServiceRow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  price: string | null;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusHistoryRow {
  id: string;
  serviceId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface ServiceSpecialistRow {
  id: string;
  serviceId: string;
  companyId: string;
  specialistProfileId: string;
  createdAt: Date;
}

export class ServiceRepository {
  constructor(private readonly pool: Pool) {}

  async insert(
    client: PoolClient,
    input: {
      companyId: string;
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number;
      price: string | null;
    },
  ): Promise<ServiceRow> {
    const { rows } = await client.query<ServiceRow>(
      `INSERT INTO services_schema.services
         ("companyId", "name", "description", "category", "durationMinutes", "price", "status")
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [input.companyId, input.name, input.description, input.category, input.durationMinutes, input.price],
    );
    return rows[0]!;
  }

  async findById(serviceId: string): Promise<ServiceRow | undefined> {
    const { rows } = await this.pool.query<ServiceRow>(`SELECT * FROM services_schema.services WHERE "id" = $1`, [
      serviceId,
    ]);
    return rows[0];
  }

  async findByIdAndCompany(serviceId: string, companyId: string): Promise<ServiceRow | undefined> {
    const { rows } = await this.pool.query<ServiceRow>(
      `SELECT * FROM services_schema.services WHERE "id" = $1 AND "companyId" = $2`,
      [serviceId, companyId],
    );
    return rows[0];
  }

  async listByCompany(companyId: string, publishedOnly: boolean): Promise<ServiceRow[]> {
    const { rows } = await this.pool.query<ServiceRow>(
      publishedOnly
        ? `SELECT * FROM services_schema.services WHERE "companyId" = $1 AND "status" = 'published' ORDER BY "createdAt" DESC`
        : `SELECT * FROM services_schema.services WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
      [companyId],
    );
    return rows;
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    skip: number;
    take: number;
  }): Promise<{ items: ServiceRow[]; total: number }> {
    const conditions: string[] = [`"status" = 'published'`];
    const params: unknown[] = [];

    if (filters.q) {
      params.push(`%${filters.q}%`);
      conditions.push(`("name" ILIKE $${params.length} OR "description" ILIKE $${params.length})`);
    }
    if (filters.category) {
      params.push(`%${filters.category}%`);
      conditions.push(`"category" ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const { rows: countRows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM services_schema.services WHERE ${where}`,
      params,
    );

    params.push(filters.take, filters.skip);
    const { rows } = await this.pool.query<ServiceRow>(
      `SELECT * FROM services_schema.services WHERE ${where}
       ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows, total: Number(countRows[0]!.count) };
  }

  async update(
    client: PoolClient,
    serviceId: string,
    patch: Partial<{
      name: string;
      description: string | null;
      category: string | null;
      durationMinutes: number;
      price: string | null;
      status: ServiceStatus;
    }>,
  ): Promise<ServiceRow> {
    const columns = Object.keys(patch) as Array<keyof typeof patch>;
    const setClauses = columns.map((col, i) => `"${col}" = $${i + 2}`);
    const values = columns.map((col) => patch[col]);

    const { rows } = await client.query<ServiceRow>(
      `UPDATE services_schema.services SET ${setClauses.join(', ')}, "updatedAt" = now()
       WHERE "id" = $1 RETURNING *`,
      [serviceId, ...values],
    );
    return rows[0]!;
  }

  async insertStatusHistory(
    client: PoolClient,
    input: { serviceId: string; fromStatus: string | null; toStatus: string; changedByUserId: string | null },
  ): Promise<void> {
    await client.query(
      `INSERT INTO services_schema.service_status_history
         ("serviceId", "fromStatus", "toStatus", "changedByUserId")
       VALUES ($1, $2, $3, $4)`,
      [input.serviceId, input.fromStatus, input.toStatus, input.changedByUserId],
    );
  }

  async listStatusHistory(serviceId: string): Promise<StatusHistoryRow[]> {
    const { rows } = await this.pool.query<StatusHistoryRow>(
      `SELECT * FROM services_schema.service_status_history WHERE "serviceId" = $1 ORDER BY "createdAt" DESC`,
      [serviceId],
    );
    return rows;
  }

  async findAssignment(serviceId: string, specialistProfileId: string): Promise<ServiceSpecialistRow | undefined> {
    const { rows } = await this.pool.query<ServiceSpecialistRow>(
      `SELECT * FROM services_schema.service_specialists WHERE "serviceId" = $1 AND "specialistProfileId" = $2`,
      [serviceId, specialistProfileId],
    );
    return rows[0];
  }

  async insertAssignment(
    client: PoolClient,
    input: { serviceId: string; companyId: string; specialistProfileId: string },
  ): Promise<ServiceSpecialistRow> {
    const { rows } = await client.query<ServiceSpecialistRow>(
      `INSERT INTO services_schema.service_specialists ("serviceId", "companyId", "specialistProfileId")
       VALUES ($1, $2, $3) RETURNING *`,
      [input.serviceId, input.companyId, input.specialistProfileId],
    );
    return rows[0]!;
  }

  async listAssignmentsByService(serviceId: string): Promise<ServiceSpecialistRow[]> {
    const { rows } = await this.pool.query<ServiceSpecialistRow>(
      `SELECT * FROM services_schema.service_specialists WHERE "serviceId" = $1 ORDER BY "createdAt" ASC`,
      [serviceId],
    );
    return rows;
  }

  async listAssignmentsBySpecialist(specialistProfileId: string): Promise<ServiceSpecialistRow[]> {
    const { rows } = await this.pool.query<ServiceSpecialistRow>(
      `SELECT * FROM services_schema.service_specialists WHERE "specialistProfileId" = $1 ORDER BY "createdAt" DESC`,
      [specialistProfileId],
    );
    return rows;
  }

  async removeAssignment(client: PoolClient, serviceId: string, specialistProfileId: string): Promise<void> {
    await client.query(
      `DELETE FROM services_schema.service_specialists WHERE "serviceId" = $1 AND "specialistProfileId" = $2`,
      [serviceId, specialistProfileId],
    );
  }
}
