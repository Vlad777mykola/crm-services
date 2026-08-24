import { EntitySchema } from 'typeorm';

export interface ReviewRow {
  id: string;
  appointmentId: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export const ReviewEntity = new EntitySchema<ReviewRow>({
  name: 'Review',
  schema: 'reviews_schema',
  tableName: 'reviews',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    appointmentId: {
      type: 'uuid',
    },
    companyId: {
      type: 'uuid',
    },
    serviceId: {
      type: 'uuid',
    },
    specialistProfileId: {
      type: 'uuid',
      nullable: true,
    },
    clientUserId: {
      type: 'uuid',
    },
    rating: {
      type: 'smallint',
    },
    comment: {
      type: 'text',
      nullable: true,
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
    },
  },
  uniques: [
    {
      name: 'UQ_reviews_appointmentId',
      columns: ['appointmentId'],
    },
  ],
  indices: [
    {
      name: 'IDX_reviews_companyId',
      columns: ['companyId'],
    },
    {
      name: 'IDX_reviews_serviceId',
      columns: ['serviceId'],
    },
    {
      name: 'IDX_reviews_specialistProfileId',
      columns: ['specialistProfileId'],
    },
  ],
});
