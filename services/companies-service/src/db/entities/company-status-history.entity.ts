import { EntitySchema } from 'typeorm';

export interface StatusHistoryRow {
  id: string;
  companyId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export const CompanyStatusHistoryEntity = new EntitySchema<StatusHistoryRow>({
  name: 'CompanyStatusHistory',
  schema: 'companies_schema',
  tableName: 'company_status_history',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    companyId: {
      type: 'uuid',
    },
    fromStatus: {
      type: String,
      length: 50,
      nullable: true,
    },
    toStatus: {
      type: String,
      length: 50,
    },
    changedByUserId: {
      type: 'uuid',
      nullable: true,
    },
    reason: {
      type: 'text',
      nullable: true,
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_company_status_history_companyId',
      columns: ['companyId'],
    },
  ],
});
