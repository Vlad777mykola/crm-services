import { EntitySchema } from 'typeorm';

export interface ServiceProjectionRow {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
  durationMinutes: number;
  updatedAt: Date;
}

export const AppointmentServiceProjectionEntity = new EntitySchema<ServiceProjectionRow>({
  name: 'AppointmentServiceProjection',
  schema: 'appointments_schema',
  tableName: 'appointment_service_projection',
  columns: {
    serviceId: { type: 'uuid', primary: true },
    companyId: { type: 'uuid' },
    name: { type: String, length: 255 },
    status: { type: String, length: 20 },
    durationMinutes: { type: Number, default: 60 },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
