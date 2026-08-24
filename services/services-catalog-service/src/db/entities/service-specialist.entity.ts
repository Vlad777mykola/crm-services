import { EntitySchema } from 'typeorm';

export interface ServiceSpecialistRow {
  id: string;
  serviceId: string;
  companyId: string;
  specialistProfileId: string;
  createdAt: Date;
}

export const ServiceSpecialistEntity = new EntitySchema<ServiceSpecialistRow>({
  name: 'ServiceSpecialist',
  schema: 'services_schema',
  tableName: 'service_specialists',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    serviceId: { type: 'uuid' },
    companyId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid' },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  uniques: [
    { name: 'UQ_service_specialists_service_specialist', columns: ['serviceId', 'specialistProfileId'] },
  ],
  indices: [
    { name: 'IDX_service_specialists_serviceId', columns: ['serviceId'] },
    { name: 'IDX_service_specialists_specialistProfileId', columns: ['specialistProfileId'] },
  ],
});
