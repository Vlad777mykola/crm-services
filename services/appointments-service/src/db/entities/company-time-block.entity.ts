import { EntitySchema } from 'typeorm';

export interface CompanyTimeBlockRow {
  id: string;
  companyId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export const CompanyTimeBlockEntity = new EntitySchema<CompanyTimeBlockRow>({
  name: 'CompanyTimeBlock',
  schema: 'appointments_schema',
  tableName: 'company_time_blocks',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    startsAt: { type: 'timestamptz' },
    endsAt: { type: 'timestamptz' },
    reason: { type: 'text', nullable: true },
    createdByUserId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [{ name: 'IDX_company_time_blocks_company_range', columns: ['companyId', 'startsAt', 'endsAt'] }],
});
