import type { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { In } from 'typeorm';

import { CompanyEntity, type CompanyRow, type CompanyStatus } from './entities/company.entity.js';
import { CompanyStatusHistoryEntity, type StatusHistoryRow } from './entities/company-status-history.entity.js';

export interface PublicCompanyRow extends CompanyRow {
  rating: number;
  reviewsCount: number;
}

interface CompanyRatingRaw {
  companyId: string;
  rating: string | number | null;
  reviewsCount: string | number | null;
}

interface DatabaseErrorShape {
  code?: string;
  driverError?: {
    code?: string;
  };
  message?: string;
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
  constructor(private readonly dataSource: DataSource) {}

  async generateUniqueSlug(manager: EntityManager, name: string): Promise<string> {
    const repository = manager.getRepository(CompanyEntity);
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (true) {
      const exists = await repository.exists({ where: { slug: candidate } });
      if (!exists) return candidate;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  async insert(
    manager: EntityManager,
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
    const repository = manager.getRepository(CompanyEntity);
    return repository.save(repository.create({ ...input, status: 'draft' }));
  }

  async findById(companyId: string): Promise<CompanyRow | null> {
    return this.dataSource.getRepository(CompanyEntity).findOne({ where: { id: companyId } });
  }

  async findPublicById(companyId: string): Promise<PublicCompanyRow | null> {
    const company = await this.findById(companyId);
    if (!company) return null;

    const [publicCompany] = await this.attachRatings([company]);
    return publicCompany;
  }

  async findByIdWithManager(manager: EntityManager, companyId: string): Promise<CompanyRow | null> {
    return manager.getRepository(CompanyEntity).findOne({ where: { id: companyId } });
  }

  async findByIds(companyIds: string[]): Promise<CompanyRow[]> {
    if (companyIds.length === 0) return [];
    return this.dataSource.getRepository(CompanyEntity).find({ where: { id: In(companyIds) } });
  }

  async update(
    manager: EntityManager,
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
    const repository = manager.getRepository(CompanyEntity);
    const existing = await repository.findOneOrFail({ where: { id: companyId } });
    return repository.save(repository.merge(existing, patch, { updatedAt: new Date() }));
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    city?: string;
    skip: number;
    take: number;
  }): Promise<{ items: PublicCompanyRow[]; total: number }> {
    const query = this.applyPublicFilters(this.basePublicQuery(), filters);
    const [companies, total] = await query.take(filters.take).skip(filters.skip).getManyAndCount();
    return { items: await this.attachRatings(companies), total };
  }

  async insertStatusHistory(
    manager: EntityManager,
    input: {
      companyId: string;
      fromStatus: string | null;
      toStatus: string;
      changedByUserId: string | null;
      reason?: string | null;
    },
  ): Promise<void> {
    await manager.getRepository(CompanyStatusHistoryEntity).insert({
      companyId: input.companyId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      changedByUserId: input.changedByUserId,
      reason: input.reason ?? null,
    });
  }

  async listStatusHistory(companyId: string): Promise<StatusHistoryRow[]> {
    return this.dataSource.getRepository(CompanyStatusHistoryEntity).find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  private basePublicQuery(): SelectQueryBuilder<CompanyRow> {
    return this.dataSource
      .getRepository(CompanyEntity)
      .createQueryBuilder('company')
      .where('company.status = :status', { status: 'published' })
      .orderBy('company.createdAt', 'DESC');
  }

  private applyPublicFilters(
    query: SelectQueryBuilder<CompanyRow>,
    filters: { q?: string; category?: string; city?: string },
  ): SelectQueryBuilder<CompanyRow> {
    if (filters.q) {
      query.andWhere('(company.name ILIKE :q OR company.description ILIKE :q)', { q: `%${filters.q}%` });
    }
    if (filters.category) {
      query.andWhere('company.category ILIKE :category', { category: `%${filters.category}%` });
    }
    if (filters.city) {
      query.andWhere('company.city ILIKE :city', { city: `%${filters.city}%` });
    }

    return query;
  }

  private async attachRatings(companies: CompanyRow[]): Promise<PublicCompanyRow[]> {
    if (companies.length === 0) return [];

    const ratings = await this.findRatings(companies.map((company) => company.id));
    return companies.map((company) => toPublicCompanyRow(company, ratings.get(company.id)));
  }

  private async findRatings(companyIds: string[]): Promise<Map<string, CompanyRatingRaw>> {
    try {
      const rows = await this.dataSource.query<CompanyRatingRaw[]>(
        `
          SELECT
            "companyId",
            "averageRating" AS "rating",
            "reviewsCount"
          FROM companies_schema.company_rating_summary
          WHERE "companyId" = ANY($1::uuid[])
        `,
        [companyIds],
      );

      return new Map(rows.map((row) => [row.companyId, row]));
    } catch (err) {
      if (!isRatingProjectionUnavailable(err)) {
        throw err;
      }

      return new Map();
    }
  }
}

function toPublicCompanyRow(company: CompanyRow, rating?: CompanyRatingRaw): PublicCompanyRow {
  return {
    ...company,
    rating: Number(rating?.rating ?? 0),
    reviewsCount: Number(rating?.reviewsCount ?? 0),
  };
}

function isRatingProjectionUnavailable(error: unknown): boolean {
  const candidate = error as DatabaseErrorShape;
  const code = candidate.driverError?.code ?? candidate.code;
  return (
    code === '42P01' ||
    code === '42703' ||
    Boolean(candidate.message?.includes('company_rating_summary'))
  );
}
