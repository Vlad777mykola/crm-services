import { EntitySchema } from 'typeorm';

export interface SpecialistAvailabilityRuleRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const SpecialistAvailabilityRuleEntity = new EntitySchema<SpecialistAvailabilityRuleRow>({
  name: 'SpecialistAvailabilityRule',
  schema: 'appointments_schema',
  tableName: 'specialist_availability_rules',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid' },
    weekday: { type: 'smallint' },
    startTime: { type: 'time' },
    endTime: { type: 'time' },
    timezone: { type: String, length: 100, default: 'UTC' },
    active: { type: Boolean, default: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'IDX_specialist_availability_rules_specialist', columns: ['companyId', 'specialistProfileId'] },
  ],
});
