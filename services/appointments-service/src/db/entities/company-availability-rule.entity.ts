import { EntitySchema } from 'typeorm';

export interface CompanyAvailabilityRuleRow {
  id: string;
  companyId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CompanyAvailabilityRuleEntity = new EntitySchema<CompanyAvailabilityRuleRow>({
  name: 'CompanyAvailabilityRule',
  schema: 'appointments_schema',
  tableName: 'company_availability_rules',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    weekday: { type: 'smallint' },
    startTime: { type: 'time' },
    endTime: { type: 'time' },
    timezone: { type: String, length: 100, default: 'UTC' },
    active: { type: Boolean, default: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [{ name: 'IDX_company_availability_rules_companyId', columns: ['companyId'] }],
});
