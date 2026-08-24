import { EntitySchema } from 'typeorm';

export interface AuthMembershipProjectionRow {
  id: string;
  userId: string;
  companyId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AuthMembershipProjectionEntity = new EntitySchema<AuthMembershipProjectionRow>({
  name: 'AuthMembershipProjection',
  schema: 'auth_schema',
  tableName: 'auth_membership_projection',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    userId: { type: 'uuid' },
    companyId: { type: 'uuid' },
    role: { type: String, length: 50 },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  uniques: [{ name: 'UQ_auth_membership_projection_company_user', columns: ['companyId', 'userId'] }],
});
