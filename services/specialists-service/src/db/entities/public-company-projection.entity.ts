import { EntitySchema } from 'typeorm';

export interface PublicCompanyProjectionRow {
  companyId: string;
  name: string;
  slug: string | null;
  status: string;
  updatedAt: Date;
}

export const PublicCompanyProjectionEntity = new EntitySchema<PublicCompanyProjectionRow>({
  name: 'PublicCompanyProjection',
  schema: 'specialists_schema',
  tableName: 'public_company_projection',
  columns: {
    companyId: { type: 'uuid', primary: true },
    name: { type: String, length: 255 },
    slug: { type: String, length: 255, nullable: true },
    status: { type: String, length: 20 },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
