import { EntitySchema } from 'typeorm';

export interface AppointmentRow {
  id: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  requestedStartAt: Date;
  startAt: Date;
  endAt: Date;
  status: string;
  createdByUserId: string | null;
  notes: string | null;
  respondedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AppointmentEntity = new EntitySchema<AppointmentRow>({
  name: 'Appointment',
  schema: 'appointments_schema',
  tableName: 'appointments',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    serviceId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid', nullable: true },
    clientUserId: { type: 'uuid' },
    requestedStartAt: { type: 'timestamptz' },
    startAt: { type: 'timestamptz' },
    endAt: { type: 'timestamptz' },
    status: { type: String, length: 20, default: 'pending' },
    createdByUserId: { type: 'uuid', nullable: true },
    notes: { type: String, nullable: true },
    respondedAt: { type: 'timestamptz', nullable: true },
    completedAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'IDX_appointments_companyId', columns: ['companyId'] },
    { name: 'IDX_appointments_serviceId', columns: ['serviceId'] },
    { name: 'IDX_appointments_clientUserId', columns: ['clientUserId'] },
    { name: 'IDX_appointments_specialistProfileId', columns: ['specialistProfileId'] },
    { name: 'IDX_appointments_startAt', columns: ['startAt'] },
  ],
});
