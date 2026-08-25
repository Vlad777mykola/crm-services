import { EntitySchema } from 'typeorm';

export interface PublicServiceProjectionRow {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
  updatedAt: Date;
}

export const PublicServiceProjectionEntity = new EntitySchema<PublicServiceProjectionRow>({
  name: 'PublicServiceProjection',
  schema: 'specialists_schema',
  tableName: 'public_service_projection',
  columns: {
    serviceId: { type: 'uuid', primary: true },
    companyId: { type: 'uuid' },
    name: { type: String, length: 255 },
    status: { type: String, length: 20 },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [{ name: 'IDX_public_service_projection_companyId', columns: ['companyId'] }],
});
