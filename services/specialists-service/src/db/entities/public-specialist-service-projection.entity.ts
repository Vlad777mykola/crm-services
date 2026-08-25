import { EntitySchema } from 'typeorm';

export interface PublicSpecialistServiceProjectionRow {
  serviceId: string;
  companyId: string;
  specialistProfileId: string;
  updatedAt: Date;
}

export const PublicSpecialistServiceProjectionEntity = new EntitySchema<PublicSpecialistServiceProjectionRow>({
  name: 'PublicSpecialistServiceProjection',
  schema: 'specialists_schema',
  tableName: 'public_specialist_service_projection',
  columns: {
    serviceId: { type: 'uuid', primary: true },
    specialistProfileId: { type: 'uuid', primary: true },
    companyId: { type: 'uuid' },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'IDX_public_specialist_service_companyId', columns: ['companyId'] },
    { name: 'IDX_public_specialist_service_specialistProfileId', columns: ['specialistProfileId'] },
  ],
});
