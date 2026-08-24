import { EntitySchema } from 'typeorm';

export interface MembershipProjectionRow {
  companyId: string;
  userId: string;
  role: string;
  updatedAt: Date;
}

export const AppointmentMembershipProjectionEntity = new EntitySchema<MembershipProjectionRow>({
  name: 'AppointmentMembershipProjection',
  schema: 'appointments_schema',
  tableName: 'appointment_membership_projection',
  columns: {
    companyId: { type: 'uuid', primary: true },
    userId: { type: 'uuid', primary: true },
    role: { type: String, length: 20 },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
