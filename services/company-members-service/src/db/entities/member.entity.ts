import { EntitySchema } from 'typeorm';

export type MemberRole = 'owner' | 'manager';
export type MemberStatus = 'active' | 'removed';

export interface MemberRow {
  id: string;
  companyId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const MemberEntity = new EntitySchema<MemberRow>({
  name: 'CompanyMember',
  schema: 'company_members_schema',
  tableName: 'company_members',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    userId: { type: 'uuid' },
    role: { type: String, length: 20 },
    status: { type: String, length: 20, default: 'active' },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  uniques: [{ name: 'UQ_company_members_company_user', columns: ['companyId', 'userId'] }],
  indices: [
    { name: 'IDX_company_members_companyId', columns: ['companyId'] },
    { name: 'IDX_company_members_userId', columns: ['userId'] },
  ],
});
