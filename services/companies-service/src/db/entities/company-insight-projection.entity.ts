import { EntitySchema } from 'typeorm';

export interface CompanyInsightProjection {
  id: string;
  companyId: string;
  insightType: string;
  summary: string;
  createdAt: Date;
}

export const CompanyInsightProjectionEntity = new EntitySchema<CompanyInsightProjection>({
  name: 'CompanyInsightProjection',
  schema: 'companies_schema',
  tableName: 'company_insight_projections',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
    },
    companyId: {
      type: 'uuid',
    },
    insightType: {
      type: String,
      length: 100,
    },
    summary: {
      type: 'text',
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_company_insight_projections_companyId',
      columns: ['companyId'],
    },
  ],
});
