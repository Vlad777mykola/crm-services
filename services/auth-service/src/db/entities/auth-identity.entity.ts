import { EntitySchema } from 'typeorm';

export interface AuthIdentityRow {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AuthIdentityEntity = new EntitySchema<AuthIdentityRow>({
  name: 'AuthIdentity',
  schema: 'auth_schema',
  tableName: 'auth_identities',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    provider: { type: String, length: 50 },
    providerUserId: { type: String, length: 255 },
    email: { type: String, length: 255, nullable: true },
    passwordHash: { type: String, length: 255, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  uniques: [{ name: 'UQ_auth_identities_provider_provider_user_id', columns: ['provider', 'providerUserId'] }],
  indices: [{ name: 'IDX_auth_identities_email', columns: ['email'] }],
});
