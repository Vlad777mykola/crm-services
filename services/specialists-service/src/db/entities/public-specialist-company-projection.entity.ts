import { EntitySchema } from 'typeorm';

export interface PublicSpecialistCompanyProjectionRow {
  specialistProfileId: string;
  companyId: string;
  updatedAt: Date;
}

export const PublicSpecialistCompanyProjectionEntity = new EntitySchema<PublicSpecialistCompanyProjectionRow>({
  name: 'PublicSpecialistCompanyProjection',
  schema: 'specialists_schema',
  tableName: 'public_specialist_company_projection',
  columns: {
    specialistProfileId: { type: 'uuid', primary: true },
    companyId: { type: 'uuid', primary: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
