import { EntitySchema } from 'typeorm';

export interface PublicSpecialistRatingSummaryRow {
  specialistProfileId: string;
  ratingSum: number;
  reviewsCount: number;
  updatedAt: Date;
}

export const PublicSpecialistRatingSummaryEntity = new EntitySchema<PublicSpecialistRatingSummaryRow>({
  name: 'PublicSpecialistRatingSummary',
  schema: 'specialists_schema',
  tableName: 'public_specialist_rating_summary',
  columns: {
    specialistProfileId: { type: 'uuid', primary: true },
    ratingSum: { type: Number },
    reviewsCount: { type: Number },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
