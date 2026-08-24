import { EntitySchema } from 'typeorm';

export interface AuthSessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  status: 'active' | 'revoked';
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AuthSessionEntity = new EntitySchema<AuthSessionRow>({
  name: 'AuthSession',
  schema: 'auth_schema',
  tableName: 'auth_sessions',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    userId: { type: 'uuid' },
    refreshTokenHash: { type: String, length: 255, unique: true },
    status: { type: String, length: 20, default: 'active' },
    userAgent: { type: String, length: 512, nullable: true },
    ipAddress: { type: String, length: 64, nullable: true },
    expiresAt: { type: 'timestamptz' },
    revokedAt: { type: 'timestamptz', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [{ name: 'IDX_auth_sessions_userId', columns: ['userId'] }],
});
