import type { AuthIdentityRow } from '../../db/identity-repository.js';

export interface IdentityView {
  id: string;
  email: string | null;
  createdAt: Date;
}

export interface AuthResult {
  identity: IdentityView;
  accessToken: string;
  refreshToken: string;
}

export function toIdentityView(row: AuthIdentityRow): IdentityView {
  return { id: row.id, email: row.email, createdAt: row.createdAt };
}
