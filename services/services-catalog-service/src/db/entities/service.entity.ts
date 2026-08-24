import { EntitySchema } from 'typeorm';

export type ServiceStatus = 'draft' | 'published' | 'suspended';

export interface ServiceRow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  price: string | null;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceEntity = new EntitySchema<ServiceRow>({
  name: 'Service',
  schema: 'services_schema',
  tableName: 'services',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    name: { type: String, length: 255 },
    description: { type: String, nullable: true },
    category: { type: String, length: 100, nullable: true },
    durationMinutes: { type: Number },
    price: { type: 'numeric', precision: 10, scale: 2, nullable: true },
    status: { type: String, length: 20, default: 'draft' },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [{ name: 'IDX_services_companyId', columns: ['companyId'] }],
});
