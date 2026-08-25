import type { MemberRow } from '../../db/member-repository.js';
import type { UserLookup } from '../ports/user-lookup.js';
import type { MemberWithUser } from '../view-models/member-with-user.js';

export async function attachUsers(users: UserLookup, rows: MemberRow[]): Promise<MemberWithUser[]> {
  const summaries = await users.findUserNamesByIds(rows.map((row) => row.userId));
  return rows.map((row) => ({
    ...row,
    user: summaries.get(row.userId) ? { id: row.userId, ...summaries.get(row.userId)! } : null,
  }));
}
