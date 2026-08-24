import { EntitySchema } from 'typeorm';

export interface CompanyProjectionRow {
  companyId: string;
  name: string;
  updatedAt: Date;
}

export const AppointmentCompanyProjectionEntity = new EntitySchema<CompanyProjectionRow>({
  name: 'AppointmentCompanyProjection',
  schema: 'appointments_schema',
  tableName: 'appointment_company_projection',
  columns: {
    companyId: { type: 'uuid', primary: true },
    name: { type: String, length: 255 },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
