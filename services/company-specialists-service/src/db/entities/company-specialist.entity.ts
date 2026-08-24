import { EntitySchema } from 'typeorm';

export type RelationStatus = 'active' | 'paused' | 'removed';

export interface CompanySpecialistRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  status: RelationStatus;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CompanySpecialistEntity = new EntitySchema<CompanySpecialistRow>({
  name: 'CompanySpecialist',
  schema: 'company_specialists_schema',
  tableName: 'company_specialists',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid' },
    status: { type: String, length: 20, default: 'active' },
    startedAt: { type: 'timestamptz', createDate: true },
    endedAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  uniques: [{ name: 'UQ_company_specialists_company_specialist', columns: ['companyId', 'specialistProfileId'] }],
  indices: [
    { name: 'IDX_cs_companyId', columns: ['companyId'] },
    { name: 'IDX_cs_specialistProfileId', columns: ['specialistProfileId'] },
  ],
});
