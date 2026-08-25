import type { MemberRow } from '../../db/member-repository.js';
import { AppError } from '../../errors/AppError.js';
import type { MemberReadRepository } from '../ports/member-repositories.js';

export async function requireRole(
  members: MemberReadRepository,
  companyId: string,
  userId: string,
  allowedRoles: Array<'owner' | 'manager'>,
): Promise<MemberRow> {
  const membership = await members.findByCompanyAndUser(companyId, userId);
  if (!membership || membership.status !== 'active' || !allowedRoles.includes(membership.role)) {
    throw new AppError('You do not have permission to manage this company', 403);
  }
  return membership;
}

export function assertCanTarget(member: MemberRow): void {
  if (member.role === 'owner') {
    throw new AppError('The company owner cannot be modified or removed', 403);
  }
}
