import { EntitySchema } from 'typeorm';

export interface StatusHistoryRow {
  id: string;
  serviceId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export const ServiceStatusHistoryEntity = new EntitySchema<StatusHistoryRow>({
  name: 'ServiceStatusHistory',
  schema: 'services_schema',
  tableName: 'service_status_history',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    serviceId: { type: 'uuid' },
    fromStatus: { type: String, length: 50, nullable: true },
    toStatus: { type: String, length: 50 },
    changedByUserId: { type: 'uuid', nullable: true },
    reason: { type: String, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [{ name: 'IDX_service_status_history_serviceId', columns: ['serviceId'] }],
});
