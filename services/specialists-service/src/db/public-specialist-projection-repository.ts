import type { DataSource, EntityManager } from 'typeorm';

import { PublicServiceProjectionEntity } from './entities/public-service-projection.entity.js';
import { PublicSpecialistCompanyProjectionEntity } from './entities/public-specialist-company-projection.entity.js';
import { PublicSpecialistServiceProjectionEntity } from './entities/public-specialist-service-projection.entity.js';

export interface PublicSpecialistServiceView {
  id: string;
  name: string;
}

export interface PublicSpecialistCompanyView {
  id: string;
  name: string;
  slug: string | null;
  services: PublicSpecialistServiceView[];
}

export interface PublicSpecialistProfileView {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
  status: string;
  rating: number;
  reviewsCount: number;
  companies: PublicSpecialistCompanyView[];
  createdAt: Date;
  updatedAt: Date;
}

interface PublicSpecialistRawRow {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
  status: string;
  rating: string | number | null;
  reviewsCount: string | number | null;
  companies: PublicSpecialistCompanyView[] | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PublicSpecialistProjectionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertCompany(
    manager: EntityManager,
    input: { companyId: string; name: string; slug?: string | null; status: string },
  ): Promise<void> {
    await manager.query(
      `
        INSERT INTO specialists_schema.public_company_projection
          ("companyId", "name", "slug", "status", "updatedAt")
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT ("companyId") DO UPDATE
        SET "name" = EXCLUDED."name",
            "slug" = COALESCE(EXCLUDED."slug", specialists_schema.public_company_projection."slug"),
            "status" = EXCLUDED."status",
            "updatedAt" = now()
      `,
      [input.companyId, input.name, input.slug ?? null, input.status],
    );
  }

  async addCompanySpecialist(manager: EntityManager, companyId: string, specialistProfileId: string): Promise<void> {
    await manager.getRepository(PublicSpecialistCompanyProjectionEntity).upsert(
      { companyId, specialistProfileId, updatedAt: new Date() },
      { conflictPaths: ['specialistProfileId', 'companyId'] },
    );
  }

  async removeCompanySpecialist(manager: EntityManager, companyId: string, specialistProfileId: string): Promise<void> {
    await manager.getRepository(PublicSpecialistCompanyProjectionEntity).delete({ companyId, specialistProfileId });
    await manager.getRepository(PublicSpecialistServiceProjectionEntity).delete({ companyId, specialistProfileId });
  }

  async upsertService(
    manager: EntityManager,
    input: { serviceId: string; companyId: string; name: string; status: string },
  ): Promise<void> {
    await manager.getRepository(PublicServiceProjectionEntity).upsert(
      {
        serviceId: input.serviceId,
        companyId: input.companyId,
        name: input.name,
        status: input.status,
        updatedAt: new Date(),
      },
      { conflictPaths: ['serviceId'] },
    );
  }

  async addServiceSpecialist(
    manager: EntityManager,
    input: { serviceId: string; companyId: string; specialistProfileId: string },
  ): Promise<void> {
    await manager.getRepository(PublicSpecialistServiceProjectionEntity).upsert(
      { ...input, updatedAt: new Date() },
      { conflictPaths: ['serviceId', 'specialistProfileId'] },
    );
  }

  async removeServiceSpecialist(manager: EntityManager, serviceId: string, specialistProfileId: string): Promise<void> {
    await manager.getRepository(PublicSpecialistServiceProjectionEntity).delete({ serviceId, specialistProfileId });
  }

  async recordReview(manager: EntityManager, specialistProfileId: string, rating: number): Promise<void> {
    await manager.query(
      `
        INSERT INTO specialists_schema.public_specialist_rating_summary
          ("specialistProfileId", "ratingSum", "reviewsCount", "updatedAt")
        VALUES ($1, $2, 1, now())
        ON CONFLICT ("specialistProfileId") DO UPDATE
        SET "ratingSum" = specialists_schema.public_specialist_rating_summary."ratingSum" + EXCLUDED."ratingSum",
            "reviewsCount" = specialists_schema.public_specialist_rating_summary."reviewsCount" + 1,
            "updatedAt" = now()
      `,
      [specialistProfileId, rating],
    );
  }

  async listPublic(filters: {
    q?: string;
    category?: string;
    city?: string;
    remoteOnly?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: PublicSpecialistProfileView[]; total: number }> {
    const where = this.buildPublicWhere(filters);
    const countRows = await this.dataSource.query<Array<{ total: string }>>(
      `SELECT COUNT(*)::text AS total FROM specialists_schema.specialist_profiles specialist ${where.sql}`,
      where.params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const items = await this.dataSource.query<PublicSpecialistRawRow[]>(
      `
        ${this.publicSpecialistSelect()}
        FROM specialists_schema.specialist_profiles specialist
        LEFT JOIN specialists_schema.public_specialist_rating_summary rating
          ON rating."specialistProfileId" = specialist."id"
        ${where.sql}
        ORDER BY specialist."createdAt" DESC
        LIMIT $${where.params.length + 1}
        OFFSET $${where.params.length + 2}
      `,
      [...where.params, filters.take, filters.skip],
    );

    return { items: items.map(toView), total };
  }

  async findById(specialistProfileId: string): Promise<PublicSpecialistProfileView | null> {
    const rows = await this.dataSource.query<PublicSpecialistRawRow[]>(
      `
        ${this.publicSpecialistSelect()}
        FROM specialists_schema.specialist_profiles specialist
        LEFT JOIN specialists_schema.public_specialist_rating_summary rating
          ON rating."specialistProfileId" = specialist."id"
        WHERE specialist."id" = $1
        LIMIT 1
      `,
      [specialistProfileId],
    );

    return rows[0] ? toView(rows[0]) : null;
  }

  private buildPublicWhere(filters: {
    q?: string;
    category?: string;
    city?: string;
    remoteOnly?: boolean;
  }): { sql: string; params: unknown[] } {
    const clauses = ['specialist."status" = $1'];
    const params: unknown[] = ['published'];

    if (filters.q) {
      params.push(`%${filters.q}%`);
      const index = params.length;
      clauses.push(`
        (
          specialist."displayName" ILIKE $${index}
          OR specialist."headline" ILIKE $${index}
          OR specialist."bio" ILIKE $${index}
          OR EXISTS (
            SELECT 1
            FROM specialists_schema.public_specialist_company_projection specialist_company
            JOIN specialists_schema.public_company_projection company
              ON company."companyId" = specialist_company."companyId"
            WHERE specialist_company."specialistProfileId" = specialist."id"
              AND company."name" ILIKE $${index}
              AND company."status" = 'published'
          )
          OR EXISTS (
            SELECT 1
            FROM specialists_schema.public_specialist_service_projection specialist_service
            JOIN specialists_schema.public_service_projection service
              ON service."serviceId" = specialist_service."serviceId"
            JOIN specialists_schema.public_company_projection company
              ON company."companyId" = specialist_service."companyId"
            WHERE specialist_service."specialistProfileId" = specialist."id"
              AND service."name" ILIKE $${index}
              AND service."status" = 'published'
              AND company."status" = 'published'
          )
        )
      `);
    }
    if (filters.category) {
      params.push(`%${filters.category}%`);
      clauses.push(`specialist."category" ILIKE $${params.length}`);
    }
    if (filters.city) {
      params.push(`%${filters.city}%`);
      clauses.push(`specialist."city" ILIKE $${params.length}`);
    }
    if (filters.remoteOnly) {
      clauses.push('specialist."isRemoteSupported" = true');
    }

    return { sql: `WHERE ${clauses.join(' AND ')}`, params };
  }

  private publicSpecialistSelect(): string {
    return `
      SELECT
        specialist."id",
        specialist."userId",
        specialist."displayName",
        specialist."headline",
        specialist."bio",
        specialist."category",
        specialist."city",
        specialist."isRemoteSupported",
        specialist."status",
        specialist."createdAt",
        specialist."updatedAt",
        CASE
          WHEN COALESCE(rating."reviewsCount", 0) = 0 THEN 0
          ELSE ROUND((rating."ratingSum"::numeric / rating."reviewsCount"::numeric), 1)
        END AS "rating",
        COALESCE(rating."reviewsCount", 0) AS "reviewsCount",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', company."companyId",
                'name', company."name",
                'slug', company."slug",
                'services', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object('id', service."serviceId", 'name', service."name")
                      ORDER BY service."name" ASC
                    )
                    FROM specialists_schema.public_specialist_service_projection specialist_service
                    JOIN specialists_schema.public_service_projection service
                      ON service."serviceId" = specialist_service."serviceId"
                    WHERE specialist_service."specialistProfileId" = specialist."id"
                      AND specialist_service."companyId" = company."companyId"
                      AND service."status" = 'published'
                  ),
                  '[]'::jsonb
                )
              )
              ORDER BY company."name" ASC
            )
            FROM specialists_schema.public_specialist_company_projection specialist_company
            JOIN specialists_schema.public_company_projection company
              ON company."companyId" = specialist_company."companyId"
            WHERE specialist_company."specialistProfileId" = specialist."id"
              AND company."status" = 'published'
          ),
          '[]'::jsonb
        ) AS "companies"
    `;
  }
}

function toView(row: PublicSpecialistRawRow): PublicSpecialistProfileView {
  return {
    ...row,
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviewsCount ?? 0),
    companies: typeof row.companies === 'string' ? JSON.parse(row.companies) : row.companies ?? [],
  };
}
