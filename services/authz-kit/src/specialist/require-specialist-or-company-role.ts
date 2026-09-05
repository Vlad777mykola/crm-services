import { requireCompanyRole } from '../company/require-company-role.js';
import type { CompanyRole, MembershipLookup, SpecialistOwnerLookup } from '../types.js';
import { isSpecialistOwner } from './require-specialist-owner.js';

/**
 * The core "not manager-only" rule from the appointment/availability access
 * policy: the specialist themself always has access to their own data;
 * otherwise fall back to a company role check. Never require both.
 */
export async function requireSpecialistOwnerOrCompanyRole(
  deps: { membership: MembershipLookup; specialistOwner: SpecialistOwnerLookup },
  companyId: string,
  specialistProfileId: string,
  userId: string,
  allowedRoles: readonly CompanyRole[],
): Promise<void> {
  if (await isSpecialistOwner(deps.specialistOwner, specialistProfileId, userId)) {
    return;
  }
  await requireCompanyRole(deps.membership, companyId, userId, allowedRoles);
}
