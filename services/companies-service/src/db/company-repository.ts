import type { Pool, PoolClient } from 'pg';

export type CompanyStatus = 'draft' | 'published' | 'suspended';

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: CompanyStatus;
  isRemoteSupported: boolean;
  city: string | null;
  address: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusHistoryRow {
  id: string;
  companyId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'company';
}

export class CompanyRepository {
  constructor(private readonly pool: Pool) {}

  async generateUniqueSlug(client: PoolClient, name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (true) {
      const { rows } = await client.query('SELECT 1 FROM companies_schema.companies WHERE "slug" = $1', [candidate]);
      if (rows.length === 0) return candidate;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  async insert(
    client: PoolClient,
    input: {
      name: string;
      slug: string;
      description: string | null;
      category: string | null;
      website: string | null;
      phone: string | null;
      email: string | null;
      isRemoteSupported: boolean;
      city: string | null;
      address: string | null;
      createdByUserId: string;
    },
  ): Promise<CompanyRow> {
    const { rows } = await client.query<CompanyRow>(
      `INSERT INTO companies_schema.companies
         ("name", "slug", "description", "category", "website", "phone", "email",
          "status", "isRemoteSupported", "city", "address", "createdByUserId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11)
       RETURNING *`,
      [
        input.name,
        input.slug,
        input.description,
        input.category,
        input.website,
        input.phone,
        input.email,
        input.isRemoteSupported,
        input.city,
        input.address,
        input.createdByUserId,
      ],
    );
    return rows[0];
  }

  async findById(companyId: string): Promise<CompanyRow | undefined> {
    const { rows } = await this.pool.query<CompanyRow>('SELECT * FROM companies_schema.companies WHERE "id" = $1', [
      companyId,
    ]);
    return rows[0];
  }

  async findByIdWithClient(client: PoolClient, companyId: string): Promise<CompanyRow | undefined> {
    const { rows } = await client.query<CompanyRow>('SELECT * FROM companies_schema.companies WHERE "id" = $1', [
      companyId,
    ]);
    return rows[0];
  }

  async findByIds(companyIds: string[]): Promise<CompanyRow[]> {
    if (companyIds.length === 0) return [];
    const { rows } = await this.pool.query<CompanyRow>(
      'SELECT * FROM companies_schema.companies WHERE "id" = ANY($1)',
      [companyIds],
    );
    return rows;
  }

  async update(
    client: PoolClient,
    companyId: string,
    patch: Partial<{
      name: string;
      description: string | null;
      category: string | null;
      website: string | null;
      phone: string | null;
      email: string | null;
      isRemoteSupported: boolean;
      city: string | null;
      address: string | null;
      status: CompanyStatus;
    }>,
  ): Promise<CompanyRow> {
    const columns = Object.keys(patch) as Array<keyof typeof patch>;
    const setClauses = columns.map((col, i) => `"${col}" = $${i + 2}`);
    const values = columns.map((col) => patch[col]);

    const { rows } = await client.query<CompanyRow>(
      `UPDATE companies_schema.companies SET ${setClauses.join(', ')}, "updatedAt" = now()
       WHERE "id" = $1 RETURNING *`,
      [companyId, ...values],
    );
    return rows[0];
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    city?: string;
    skip: number;
    take: number;
  }): Promise<{ items: CompanyRow[]; total: number }> {
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
    if (filters.city) {
      params.push(`%${filters.city}%`);
      conditions.push(`"city" ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const { rows: countRows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM companies_schema.companies WHERE ${where}`,
      params,
    );

    params.push(filters.take, filters.skip);
    const { rows } = await this.pool.query<CompanyRow>(
      `SELECT * FROM companies_schema.companies WHERE ${where}
       ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { items: rows, total: Number(countRows[0].count) };
  }

  async insertStatusHistory(
    client: PoolClient,
    input: { companyId: string; fromStatus: string | null; toStatus: string; changedByUserId: string | null; reason?: string | null },
  ): Promise<void> {
    await client.query(
      `INSERT INTO companies_schema.company_status_history
         ("companyId", "fromStatus", "toStatus", "changedByUserId", "reason")
       VALUES ($1, $2, $3, $4, $5)`,
      [input.companyId, input.fromStatus, input.toStatus, input.changedByUserId, input.reason ?? null],
    );
  }

  async listStatusHistory(companyId: string): Promise<StatusHistoryRow[]> {
    const { rows } = await this.pool.query<StatusHistoryRow>(
      `SELECT * FROM companies_schema.company_status_history WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
      [companyId],
    );
    return rows;
  }
}
