import { EntitySchema } from 'typeorm';

export interface StatusHistoryRow {
  id: string;
  appointmentId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export const AppointmentStatusHistoryEntity = new EntitySchema<StatusHistoryRow>({
  name: 'AppointmentStatusHistory',
  schema: 'appointments_schema',
  tableName: 'appointment_status_history',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    appointmentId: { type: 'uuid' },
    fromStatus: { type: String, length: 50, nullable: true },
    toStatus: { type: String, length: 50 },
    changedByUserId: { type: 'uuid', nullable: true },
    reason: { type: String, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [{ name: 'IDX_appointment_status_history_appointmentId', columns: ['appointmentId'] }],
});
