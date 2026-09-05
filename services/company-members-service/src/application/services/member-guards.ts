import { requireCompanyRole, type CompanyRole, type MembershipLookup } from '@crm/authz-kit';

import type { MemberRow } from '../../db/member-repository.js';
import { AppError } from '../../errors/AppError.js';
import type { MemberReadRepository } from '../ports/member-repositories.js';

function toMembershipLookup(members: MemberReadRepository): MembershipLookup {
  return {
    async findMembership(companyId, userId) {
      const membership = await members.findByCompanyAndUser(companyId, userId);
      if (!membership || membership.status !== 'active') return null;
      return { role: membership.role as CompanyRole };
    },
  };
}

/**
 * "Active membership" is this service's own domain rule (authz-kit only
 * knows about roles); the role-set check itself delegates to the shared,
 * DB-free @crm/authz-kit primitive.
 */
export async function requireRole(
  members: MemberReadRepository,
  companyId: string,
  userId: string,
  allowedRoles: CompanyRole[],
): Promise<void> {
  await requireCompanyRole(toMembershipLookup(members), companyId, userId, allowedRoles);
}

export function assertCanTarget(member: MemberRow): void {
  if (member.role === 'owner') {
    throw new AppError('The company owner cannot be modified or removed', 403);
  }
}
