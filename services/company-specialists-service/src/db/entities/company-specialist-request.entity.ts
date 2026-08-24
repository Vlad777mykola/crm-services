import { EntitySchema } from 'typeorm';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface CompanySpecialistRequestRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  requestedByUserId: string;
  status: RequestStatus;
  message: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CompanySpecialistRequestEntity = new EntitySchema<CompanySpecialistRequestRow>({
  name: 'CompanySpecialistRequest',
  schema: 'company_specialists_schema',
  tableName: 'company_specialist_requests',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid' },
    requestedByUserId: { type: 'uuid' },
    status: { type: String, length: 20, default: 'pending' },
    message: { type: 'text', nullable: true },
    respondedAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'IDX_csr_companyId', columns: ['companyId'] },
    { name: 'IDX_csr_specialistProfileId', columns: ['specialistProfileId'] },
  ],
});
