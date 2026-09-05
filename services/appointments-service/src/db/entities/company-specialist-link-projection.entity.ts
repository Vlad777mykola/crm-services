import { EntitySchema } from 'typeorm';

/**
 * Fed by company-specialist.accepted/.removed (company-specialists-service).
 * Answers "is this specialist actually an active relation of this company"
 * locally, so availability management can reject a companyId/specialistProfileId
 * pair that was never linked (or has since been removed) instead of silently
 * accepting rules for a relationship that doesn't exist.
 */
export interface CompanySpecialistLinkProjectionRow {
  companyId: string;
  specialistProfileId: string;
  active: boolean;
  updatedAt: Date;
}

export const CompanySpecialistLinkProjectionEntity = new EntitySchema<CompanySpecialistLinkProjectionRow>({
  name: 'CompanySpecialistLinkProjection',
  schema: 'appointments_schema',
  tableName: 'company_specialist_link_projection',
  columns: {
    companyId: { type: 'uuid', primary: true },
    specialistProfileId: { type: 'uuid', primary: true },
    active: { type: 'boolean' },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'IDX_company_specialist_link_projection_specialistProfileId', columns: ['specialistProfileId'] },
  ],
});
