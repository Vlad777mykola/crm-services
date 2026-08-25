import type { MemberRow } from '../../db/member-repository.js';

export interface MemberWithUser extends MemberRow {
  user: { id: string; name: string; email: string | null } | null;
}
