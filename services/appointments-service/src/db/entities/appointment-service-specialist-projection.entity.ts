import { EntitySchema } from 'typeorm';

export interface ServiceSpecialistProjectionRow {
  serviceId: string;
  specialistProfileId: string;
  updatedAt: Date;
}

export const AppointmentServiceSpecialistProjectionEntity = new EntitySchema<ServiceSpecialistProjectionRow>({
  name: 'AppointmentServiceSpecialistProjection',
  schema: 'appointments_schema',
  tableName: 'appointment_service_specialist_projection',
  columns: {
    serviceId: { type: 'uuid', primary: true },
    specialistProfileId: { type: 'uuid', primary: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
