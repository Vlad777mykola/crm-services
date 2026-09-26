import type { EntityManager } from 'typeorm';

export interface CompanyRatingSummary {
  companyId: string;
  averageRating: number;
  reviewsCount: number;
}

export class CompanyRatingRepository {
  async upsert(
    manager: EntityManager,
    input: { companyId: string; averageRating: number; reviewsCount: number },
  ): Promise<void> {
    await manager.query(
      `
        INSERT INTO companies_schema.company_rating_summary
          ("companyId", "averageRating", "reviewsCount", "updatedAt")
        VALUES ($1, $2, $3, now())
        ON CONFLICT ("companyId") DO UPDATE
        SET "averageRating" = EXCLUDED."averageRating",
            "reviewsCount" = EXCLUDED."reviewsCount",
            "updatedAt" = now()
      `,
      [input.companyId, input.averageRating, input.reviewsCount],
    );
  }
}
