import { AppError } from '@crm/http-kit';

import type { CompanyRole, MembershipLookup } from '../types.js';

export async function requireCompanyRole(
  lookup: MembershipLookup,
  companyId: string,
  userId: string,
  allowed: readonly CompanyRole[],
): Promise<void> {
  const membership = await lookup.findMembership(companyId, userId);
  if (!membership || !allowed.includes(membership.role)) {
    throw new AppError('You do not have permission to manage this company', 403);
  }
}
